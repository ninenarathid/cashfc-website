"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent as Press } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { ITEMS } from "@/lib/town/items";
import { daylight, daylightAt } from "@/lib/town/daylight";
import { seeded } from "@/lib/town/fishing";
import { GIANT, callWords } from "@/lib/town/giant-fish";
import { BOARD, BOARD_SPOTS, heldAt, nearSpot, turnOf, type BoardRefusal, type BoardSpot, type Shake, type SpotTurn } from "@/lib/town/board-insects";
import ART from "@/lib/town/catch-art.json";
import TownFoot from "./TownFoot";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import type { FarmDraw } from "./TownFarm";
import s from "./TownGiantPull.module.css";
import g from "./TownGiantFish.module.css";

/**
 * Insects found two new ways (lib/town/board-insects; the owner, 2026-10-27): a leaf rolled on a bush, its silk seams
 * cut by dragging along them and what was inside cupped (alone); and a branch shaken over a sheet (two: one bends and
 * lets go, the other holds the sheet under it, and what lands on the sheet runs for its edge until a tap cups it).
 *
 * The map marks where a roll or a branch holds something this turn (the leaf roll, a twig with beetles: the town's
 * icons). The scenes are scripts/pixel's scene-unroll-game (closed and opened, cut on one grid) and scene-shake-game, the
 * branch and the sheet pieces of the boards' own picture (public/town/catch). On a shake the holder's page keeps what
 * falls and runs and tells the shaker's by the room's letterboxes; the shaker's says how far the branch is bent and when
 * it is let go, and where it taps.
 */
const ROLL_SCENE = "/town/unroll-game-4cc9603d01.png", OPEN_SCENE = "/town/unroll-game-open-ecbaa4ae7f.png", SHAKE_SCENE = "/town/shake-game-f951776557.png";
const PIECES = `/town/catch/${ART.image.split("/").pop()}`;
type Piece = keyof typeof ART.icons;
const RW = 306, RH = 204, SW = 250, SH = 167;
/** The roll's silk seams, each a stitch across its top (the scene's own pixels). */
const SEAMS = [100, 140, 180, 220].map((x) => ({ a: { x, y: 74 }, b: { x: x + 9, y: 96 } }));
/** Where what was in the roll sits once it is open. */
const HOLLOW = { x: 160, y: 84 };
/** The shake: the branch's root on the trunk, the sheet's line, the grass. */
const ROOT = { x: 14, y: 52 }, SHEET_Y = 128, GROUND = 156;
const BRANCH: Record<string, Piece> = { cherry: "shakeBranchCherry", cedar: "shakeBranchCedar", oak: "shakeBranchOak" };
const DEBRIS: Record<string, Piece[]> = { cherry: ["fallPetals", "fallTwig", "fallLeaf"], cedar: ["fallNeedles", "fallTwig", "fallDryLeaf"], oak: ["fallLeaf", "fallTwig", "fallDryLeaf"] };
const WOOD = "pressable tk tk-btn-wood min-h-11 px-3 text-ui font-semibold disabled:opacity-50";
const GREEN = "pressable tk tk-btn flex min-h-12 items-center justify-center gap-2 font-display text-ui font-semibold disabled:opacity-50";
const OPEN = "pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border-2 border-[#f0c060] bg-[#3a2513]/95 py-1 pl-2 pr-4 text-ui font-semibold text-[#ffeccb] shadow-xl shadow-black/40";
const REFUSED: Partial<Record<BoardRefusal, [string, string]>> = {
  taken: ["มีคนได้ไปก่อนแล้ว", "Somebody had it first"], far: ["ต้องยืนใกล้กว่านี้", "Stand nearer"], soon: ["รออีกนิด", "A moment yet"],
  late: ["ไม่ทันแล้ว", "Too late"], busy: ["มีคนเรียกที่ต้นนี้อยู่", "Somebody is calling at this tree"], full: ["กระเป๋าเต็ม", "Your bag is full"],
  many: ["เรียกครบ 3 ครั้งแล้ว", "Three calls already"], long: ["ยาวเกิน 120 ตัวอักษร", "Longer than 120 letters"], empty: ["พิมพ์ข้อความก่อน", "Type something first"], none: ["ตอนนี้ไม่มีแมลงที่นี่", "Nothing here now"],
};
const CHIPS: Array<[string, string]> = [["มาด่วน!", "Quick!"], ["ขอคนถือผ้า 1 คน", "One to hold the sheet, please"]];
const clock = (ms: number) => { const sec = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };

function put(ctx: CanvasRenderingContext2D, img: HTMLImageElement, name: Piece, cx: number, cy: number) {
  const [x, y, w, h] = ART.icons[name];
  ctx.drawImage(img, x, y, w, h, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
}
/** An insect's own picture from the town's atlas, at one of its pixels to one of the scene's. */
let atlasImg: HTMLImageElement | null = null;
const atlas = () => { if (!atlasImg) { atlasImg = new Image(); atlasImg.src = ICON_ATLAS.image; } return atlasImg; };
function bug(ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number, k = 1) {
  const cell = ICON_ATLAS.icons[id as IconName], img = atlas();
  if (!cell || !img.complete) return;
  const [x, y, w, h] = cell, dw = Math.round(w * k), dh = Math.round(h * k);
  ctx.drawImage(img, x, y, w, h, Math.round(cx - dw / 2), Math.round(cy - dh / 2), dw, dh);
}
const dist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x, dy = b.y - a.y, u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y);
};
const nameOf = (id: string, th: boolean) => ITEMS[id as keyof typeof ITEMS]?.name[th ? "th" : "en"] ?? id;
/** The room's letterboxes as the shake uses them. */
export interface ShakePairing { send: (to: string, data: ShakeWord) => void; hear: (fn: ((from: string, data: unknown) => void) | null) => void }
type Fall = { id: string; kind: "bug" | "debris"; piece?: Piece; x: number; y: number; vx: number; vy: number; on: boolean; gone: boolean; cupped: boolean; at: number };
type ShakeWord = { sk: string; bend?: number; drop?: number; tap?: [number, number]; sheet?: number; falls?: Array<[number, number, number]>; cups?: number };

export interface BoardInsectsProps {
  me: string; myName: string; keeper: Keeper; th: boolean;
  here: () => { x: number; y: number } | null;
  hour: number | null;
  pairing: ShakePairing | null;
  registerDraw: (draw: FarmDraw | null) => void;
  walkTo: (x: number, y: number) => boolean;
}
export default function TownBoardInsects({ me, myName, keeper, th, here, hour, pairing, registerDraw, walkTo }: BoardInsectsProps) {
  const [turns, setTurns] = useState<SpotTurn[]>([]);
  const [shakes, setShakes] = useState<Shake[]>([]);
  const [roll, setRoll] = useState<{ spot: number; turn: SpotTurn; held: string; cut: boolean[]; opened: number; startled: number; got?: string } | null>(null);
  const [shut, setShut] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [text, setText] = useState("");
  // (the shaker's call folded to a pill while it waits for a holder: the owner's "ข เอา", 2026-10-28)
  const [small, setSmall] = useState<string | null>(null);
  const [, tick] = useState(0);
  const lang = th ? 0 : 1, now = keeper.now(), turn = turnOf(now), pos = here(), at: [number, number] | null = pos ? [Math.floor(pos.x), Math.floor(pos.y)] : null;
  // (when the spots hold something new: every refusal of a spot had or empty says it, so the turns can be learnt)
  const nextIn = clock(BOARD.turn - (((now % BOARD.turn) + BOARD.turn) % BOARD.turn));
  const say = (why: BoardRefusal) => setSaid((REFUSED[why]?.[lang] ?? (th ? "ทำไม่ได้ตอนนี้" : "Not now")) + (why === "taken" || why === "none" ? (th ? ` · รอบใหม่ใน ${nextIn}` : ` · new ones in ${nextIn}`) : ""));
  const turnWords = th ? `แมลงในใบม้วนและบนกิ่งเปลี่ยนทุก 15 นาที · รอบใหม่ใน ${nextIn}` : `Leaves and branches hold new insects every 15 minutes · next in ${nextIn}`;

  const read = useCallback(async () => { const b = await keeper.boardsNow?.(); if (b) { setTurns(b.turns); setShakes(b.shakes); } }, [keeper]);
  useEffect(() => {
    void read();
    const every = setInterval(() => void read(), 15_000), word = () => void read();
    window.addEventListener("cashtown:boards", word);
    return () => { clearInterval(every); window.removeEventListener("cashtown:boards", word); };
  }, [read]);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(id); }, []);

  const taken = (spot: BoardSpot) => turns.some((t) => t.spot === spot.id && t.turn === turn && t.taken);
  const shakeAt = (spot: BoardSpot) => shakes.filter((x) => x.spot === spot.id && x.turn === turn).sort((a, b) => b.at - a.at)[0] ?? null;
  const spent = (spot: BoardSpot) => { const x = shakeAt(spot); return !!x && x.caught > 0; };
  const holds = (spot: BoardSpot) => heldAt(spot, turn).length > 0 && (spot.board === "roll" ? !taken(spot) : !spent(spot));
  const mine = shakes.find((x) => (x.by === me || x.holder === me) && !shut.includes(x.id) && (!x.end || (x.caught > 0 && !x.claimed.includes(me)) || now - x.end < 8_000) && (x.go > 0 || now < x.at + BOARD.call)) ?? null;
  const role: "shaker" | "holder" | null = mine ? (mine.by === me ? "shaker" : "holder") : null;
  // (while my call waits, read the trees every two seconds as well as at the room's word: the holder's join starts the shake)
  const callingMine = mine && role === "shaker" && mine.go === 0 && !mine.end ? mine.id : null;
  useEffect(() => { if (!callingMine) return; const id = setInterval(() => void read(), 2_000); return () => clearInterval(id); }, [callingMine, read]);

  // ── the map: a rolled leaf on a bush, a twig with beetles on a tree, where one holds something this turn ──
  const marks = useRef({ turns, shakes }); marks.current = { turns, shakes };
  useEffect(() => {
    const draw: FarmDraw = (f) => {
      const t = turnOf(f.now);
      for (const spot of BOARD_SPOTS) {
        if (!heldAt(spot, t).length) continue;
        if (spot.board === "roll" ? marks.current.turns.some((x) => x.spot === spot.id && x.turn === t && x.taken) : marks.current.shakes.some((x) => x.spot === spot.id && x.turn === t && x.caught > 0)) continue;
        const p = f.project({ x: spot.x + 0.5, y: spot.y + 0.5 });
        if (!f.onScreen(p) || !f.img) continue;
        const icon = spot.board === "roll" ? "leafRoll" : "twigBugs", cell = ICON_ATLAS.icons[icon as IconName];
        if (!cell) continue;
        f.things.push({ depth: spot.x + spot.y + 0.9, draw: () => {
          const [ix, iy, iw, ih] = cell, sc = (18 * f.s) / Math.max(iw, ih), bob = Math.round(Math.sin(f.now / 500 + spot.id) * f.s);
          const up = (spot.board === "roll" ? 18 : 46) * f.s;
          f.ctx.drawImage(f.img!, ix, iy, iw, ih, Math.round(p.x - (iw * sc) / 2), Math.round(p.y - up - ih * sc + bob), Math.round(iw * sc), Math.round(ih * sc));
        } });
      }
    };
    registerDraw(draw);
    return () => registerDraw(null);
  }, [registerDraw]);

  // (`next dev`: which spots hold something now, and a shake's play, for the check scripts)
  const holdsRef = useRef(holds); holdsRef.current = holds;
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __townBoards?: unknown };
    w.__townBoards = { held: () => BOARD_SPOTS.filter((x) => holdsRef.current(x)).map((x) => ({ id: x.id, board: x.board, x: x.x, y: x.y, tree: x.tree ?? null })), play: () => play.current };
    return () => { delete w.__townBoards; };
  }, []);
  // ── the way to a shake called in the town's news ──
  useEffect(() => {
    const go = (e: Event) => { const x = shakes.find((y) => y.id === (e as CustomEvent<string>).detail); const spot = x && BOARD_SPOTS[x.spot]; if (!spot) return;
      for (let r = 1; r <= BOARD.reach; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkTo(spot.x + dx, spot.y + dy)) return;
      setSaid(th ? "ต้นไม้อยู่ไกล เดินไปที่ต้นนั้น" : "The tree is far: walk to it"); };
    window.addEventListener("cashtown:shake-go", go);
    return () => window.removeEventListener("cashtown:shake-go", go);
  }, [shakes, walkTo, th]);

  // ── deeds ──
  const openRollAt = async (spot: BoardSpot) => {
    if (busy) return; setBusy(true); setSaid(null);
    try {
      const did = await keeper.boardRoll?.("open", spot.id, at);
      if (!did) return;
      if (!did.ok) { if (did.why === "busy") setSaid(th ? "มีคนกำลังแกะใบนี้อยู่ รอสักครู่" : "Somebody is unrolling this one: a moment"); else say(did.why as BoardRefusal); return; }
      setRoll({ spot: spot.id, turn: did.turn, held: did.held ?? heldAt(spot, turn)[0], cut: SEAMS.map(() => false), opened: keeper.now(), startled: 0 });
    } finally { setBusy(false); }
  };
  const cupRoll = async () => {
    if (!roll || busy) return; setBusy(true); setSaid(null);
    try {
      const did = await keeper.boardRoll?.("take", roll.spot, at);
      if (!did) return;
      if (!did.ok) { say(did.why as BoardRefusal); if (did.why === "taken" || did.why === "none") setRoll(null); return; }
      setRoll({ ...roll, got: did.got }); void read();
    } finally { setBusy(false); }
  };
  const shakeDo = async (action: "call" | "text" | "join" | "end" | "claim", spot: BoardSpot, extra: { id?: string; caught?: number; text?: string } = {}) => {
    if (busy) return null; setBusy(true); setSaid(null);
    try {
      const did = await keeper.boardShake?.(action, spot.id, { ...extra, at, name: myName });
      if (!did) return null;
      if (!did.ok) { say(did.why as BoardRefusal); return null; }
      setShakes((all) => [...all.filter((x) => x.id !== did.shake.id), did.shake]);
      return did;
    } finally { setBusy(false); }
  };

  // ── the leaf roll's board ──
  const rollCanvas = useRef<HTMLCanvasElement | null>(null), stroke = useRef<Array<{ x: number; y: number }>>([]);
  const rollRef = useRef(roll); rollRef.current = roll;
  useEffect(() => {
    if (!roll) return;
    const P = { closed: new Image(), open: new Image(), pieces: new Image() };
    P.closed.src = ROLL_SCENE; P.open.src = OPEN_SCENE; P.pieces.src = PIECES;
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const ctx = rollCanvas.current?.getContext("2d"), r = rollRef.current;
      if (!ctx || !r || !P.closed.complete || !P.open.complete) return;
      const pnow = performance.now(), open = r.cut.every(Boolean);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(open ? P.open : P.closed, 0, 0, RW, RH);
      if (!open) {
        // the silk seams, each a stitch of white thread across the roll's top; a cut one, its ends curled loose
        SEAMS.forEach((m, i) => {
          if (r.cut[i]) { if (P.pieces.complete) put(ctx, P.pieces, "silkTuft", m.a.x + 4, m.a.y - 6); return; }
          const n = Math.ceil(Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y));
          for (let k = 0; k <= n; k++) { const u = k / n, x = Math.round(m.a.x + (m.b.x - m.a.x) * u), y = Math.round(m.a.y + (m.b.y - m.a.y) * u); ctx.fillStyle = "#1e2a16"; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillStyle = k % 3 ? "#f6f6ee" : "#ffffff"; ctx.fillRect(x, y, 2, 1); }
        });
        // startled: the roll shudders, and a stroke of the drag that cut across it shows where
        if (pnow - r.startled < BOARD.startle) { ctx.fillStyle = "rgba(255,180,120,0.8)"; for (const p of stroke.current) ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      } else if (!r.got) bug(ctx, r.held, HOLLOW.x + Math.sin(pnow / 160) * 2, HOLLOW.y);
      const sky = (hour !== null ? daylightAt(hour * 60) : daylight()).tint;
      if (sky[0] + sky[1] + sky[2] < 765) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgb(${sky[0]},${sky[1]},${sky[2]})`; ctx.fillRect(0, 0, RW, RH); ctx.globalCompositeOperation = "source-over"; }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [roll?.spot, roll?.opened, hour]);
  const toScene = (e: Press<HTMLElement>, w: number, h: number) => { const b = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: ((e.clientX - b.left) / b.width) * w, y: ((e.clientY - b.top) / b.height) * h }; };
  const onRoll = (phase: "down" | "move" | "up") => (e: Press<HTMLCanvasElement>) => {
    const r = rollRef.current;
    if (!r || r.cut.every(Boolean) || performance.now() - r.startled < BOARD.startle) return;
    if (phase === "down") { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); stroke.current = [toScene(e, RW, RH)]; return; }
    if (phase === "move") { if (stroke.current.length) stroke.current.push(toScene(e, RW, RH)); return; }
    const path = stroke.current; stroke.current = [];
    if (path.length < 3) return;
    // a stroke along a seam: most of it within a finger's width of it (about 44 css px across, measured on the screen as
    // drawn) and running along most of its length, the nearest uncut seam taken; one across the leaf's middle startles
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect(), near = (22 * RW) / Math.max(1, box.width);
    const along = (m: (typeof SEAMS)[number]) => { const dx = m.b.x - m.a.x, dy = m.b.y - m.a.y, l2 = dx * dx + dy * dy, us = path.map((p) => ((p.x - m.a.x) * dx + (p.y - m.a.y) * dy) / l2); return Math.min(1, Math.max(...us)) - Math.max(0, Math.min(...us)); };
    const fits = SEAMS.map((m, k) => ({ k, d: path.reduce((t, p) => t + dist(p, m.a, m.b), 0) / path.length, inside: path.filter((p) => dist(p, m.a, m.b) < near).length / path.length, along: along(m) }))
      .filter((f) => !r.cut[f.k] && f.inside >= 0.6 && f.along >= 0.6).sort((a, b) => a.d - b.d);
    const i = fits.length ? fits[0].k : -1;
    if (i >= 0) { setRoll({ ...r, cut: r.cut.map((c, k) => c || k === i) }); setSaid(null); return; }
    if (path.some((p) => p.y > 100 && p.y < 118 && p.x > 60 && p.x < 268)) { stroke.current = path; setRoll({ ...r, startled: performance.now() }); setSaid(th ? "ลากขวางใบ ตัวข้างในตกใจ รอแป๊บ" : "Across the leaf: what is inside is startled. Wait a moment"); return; }
    // (a stroke that cut nothing is said, not let pass in silence: Codex's play look)
    setSaid(th ? "ยังไม่ขาด ลากให้ทับใยสีขาว ยาวเกือบสุดเส้น" : "Not cut: follow a white seam along most of its length");
  };

  // ── the shake: the holder's page keeps what falls; the shaker's bends and taps ──
  const shakeCanvas = useRef<HTMLCanvasElement | null>(null);
  const play = useRef<{ id: string; bend: number; held: boolean; drops: number; sheet: number; falls: Fall[]; cups: number; sent: number; seen: ShakeWord | null; done: boolean; keys: Record<string, boolean> } | null>(null);
  if (mine && mine.go > 0 && (!play.current || play.current.id !== mine.id)) play.current = { id: mine.id, bend: 0, held: false, drops: 0, sheet: SW / 2, falls: [], cups: 0, sent: 0, seen: null, done: false, keys: {} };
  useEffect(() => {
    if (!pairing || !mine) return;
    pairing.hear((from, data) => {
      const w = data && typeof data === "object" && (data as ShakeWord).sk === mine.id ? (data as ShakeWord) : null, p = play.current;
      if (!w || !p || (from !== mine.by && from !== mine.holder)) return;
      p.seen = { ...p.seen, ...w } as ShakeWord;
      // (the holder's page: the shaker let go at full bend, or tapped)
      if (role === "holder" && typeof w.drop === "number" && w.drop > p.drops) dropFrom(p, mine, w.drop);
      if (role === "holder" && w.tap) tapAt(p, w.tap[0], w.tap[1]);
    });
    return () => pairing.hear(null);
  }, [pairing, mine, role]);
  function dropFrom(p: NonNullable<typeof play.current>, x: Shake, k: number) {
    p.drops = k;
    const r = seeded((x.at % 2_147_483_647) + k * 7919), spot = BOARD_SPOTS[x.spot], held = heldAt(spot, x.turn), t = performance.now();
    const debris = DEBRIS[spot.tree ?? "oak"];
    for (const [i, id] of held.entries()) p.falls.push({ id, kind: "bug", x: 70 + r() * 150, y: 60 + r() * 14, vx: (r() - 0.5) * 14, vy: 0, on: false, gone: false, cupped: false, at: t + i * 500 + r() * 300 });
    for (let i = 0; i < 4; i++) p.falls.push({ id: `d${k}${i}`, kind: "debris", piece: debris[i % debris.length], x: 55 + r() * 170, y: 58 + r() * 16, vx: (r() - 0.5) * 20, vy: 0, on: false, gone: false, cupped: false, at: t + r() * 900 });
  }
  function tapAt(p: NonNullable<typeof play.current>, x: number, y: number) {
    const hit = p.falls.find((f) => f.kind === "bug" && f.on && !f.gone && !f.cupped && Math.hypot(f.x - x, f.y - y) < 18);
    if (hit) { hit.cupped = true; p.cups++; }
  }
  useEffect(() => {
    if (!mine || mine.go === 0) return;
    const P = { scene: new Image(), pieces: new Image() };
    P.scene.src = SHAKE_SCENE; P.pieces.src = PIECES;
    const spot = BOARD_SPOTS[mine.spot], branch = BRANCH[spot.tree ?? "oak"];
    let raf = 0, before = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const ctx = shakeCanvas.current?.getContext("2d"), p = play.current;
      if (!ctx || !p || !P.scene.complete || !P.pieces.complete) return;
      const pnow = performance.now(), dt = Math.min(0.05, (pnow - before) / 1000); before = pnow;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(P.scene, 0, 0, SW, SH);
      // the branch, bent by shifting its columns down a whole pixel at a time, more towards its tip
      let bend = p.bend;
      if (role === "shaker") { p.bend = p.held ? Math.min(1, p.bend + dt / 1.4) : Math.max(0, p.bend - dt * 5); bend = p.bend; }
      else bend = p.seen?.bend ?? 0;
      const [bx, by, bw, bh] = ART.icons[branch], spring = role === "shaker" && !p.held && p.drops > 0 ? Math.sin((pnow - (p.seen?.drop ?? 0)) / 60) : 0;
      for (let c = 0; c < bw; c++) { const dy = Math.round((bend * 22 + spring * 2) * (c / bw) ** 1.6); ctx.drawImage(P.pieces, bx + c, by, 1, bh, ROOT.x + c, ROOT.y - bh / 2 + dy, 1, bh); }
      // the holder's page moves what falls and what runs on the sheet; the shaker's draws it as the holder's said
      if (role === "holder") {
        const dir = (p.keys.ArrowRight ? 1 : 0) - (p.keys.ArrowLeft ? 1 : 0);
        p.sheet = Math.max(40, Math.min(SW - 40, p.sheet + dir * 110 * dt));
        const [, , sw] = ART.icons.shakeSheet;
        for (const f of p.falls) {
          if (f.gone || f.cupped || pnow < f.at) continue;
          if (!f.on) {
            f.vy = Math.min(f.kind === "bug" ? 70 : 45, f.vy + 90 * dt); f.x += f.vx * dt; f.y += f.vy * dt;
            if (f.y >= SHEET_Y && f.y < SHEET_Y + 6 && Math.abs(f.x - p.sheet) < sw / 2 - 6) { f.on = true; f.y = SHEET_Y; f.vx = (f.x < p.sheet ? -1 : 1) * 22; }
            else if (f.y > GROUND) f.gone = true;
          } else if (f.kind === "bug") {
            // on the sheet it runs for the nearer edge; past it, it is gone into the grass
            f.x += f.vx * dt;
            if (Math.abs(f.x - p.sheet) > sw / 2 - 4) f.gone = true;
          }
        }
        if (mine.holder && pnow - p.sent > 120) { p.sent = pnow; pairing?.send(mine.by, { sk: mine.id, sheet: Math.round(p.sheet), cups: p.cups, falls: p.falls.filter((f) => pnow >= f.at && !f.gone && !f.cupped).map((f) => [Math.round(f.x), Math.round(f.y), f.kind === "bug" ? 1 : 0]) }); }
        // all that dropped is down, cupped or gone: the catch is told
        const bugs = p.falls.filter((f) => f.kind === "bug");
        // (or the shake's time is up, nothing let fall at its full bend: what was cupped is told all the same)
        // (not before the keeper takes an end, BOARD.shakeMin after the start; refused, it is tried again)
        if (!p.done && keeper.now() - mine.go >= BOARD.shakeMin && ((bugs.length && bugs.every((f) => f.gone || f.cupped)) || keeper.now() > mine.go + BOARD.shake)) { p.done = true; void shakeDo("end", spot, { id: mine.id, caught: p.cups }).then((did) => { if (!did && play.current === p) p.done = false; void read(); }); }
      } else {
        if (pnow - p.sent > 120) { p.sent = pnow; pairing?.send(mine.holder ?? "", { sk: mine.id, bend: Math.round(p.bend * 100) / 100, drop: p.drops }); }
      }
      // the sheet and what is on it or falling
      const sheetX = role === "holder" ? p.sheet : p.seen?.sheet ?? SW / 2;
      put(ctx, P.pieces, "shakeSheet", sheetX, SHEET_Y + 8);
      const shown: Array<[number, number, number, Fall | null]> = role === "holder" ? p.falls.filter((f) => pnow >= f.at && !f.gone && !f.cupped).map((f) => [f.x, f.y, f.kind === "bug" ? 1 : 0, f]) : (p.seen?.falls ?? []).map((f) => [f[0], f[1], f[2], null]);
      const held = heldAt(spot, mine.turn);
      let bi = 0;
      for (const [x, y, isBug, f] of shown) {
        if (isBug) bug(ctx, f?.id ?? held[bi++ % held.length] ?? held[0], x, y - 8, 0.6);
        else put(ctx, P.pieces, f?.piece ?? "fallLeaf", x, y);
      }
      const sky = (hour !== null ? daylightAt(hour * 60) : daylight()).tint;
      if (sky[0] + sky[1] + sky[2] < 765) { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgb(${sky[0]},${sky[1]},${sky[2]})`; ctx.fillRect(0, 0, SW, SH); ctx.globalCompositeOperation = "source-over"; }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mine?.id, mine?.go, role, hour]);
  useEffect(() => {
    if (!mine || !mine.go) return;
    const down = (e: KeyboardEvent) => { const p = play.current; if (!p || (e.target as HTMLElement)?.tagName === "INPUT" || !["ArrowLeft", "ArrowRight", " "].includes(e.key)) return; e.preventDefault(); p.keys[e.key] = true; if (e.key === " " && role === "shaker") p.held = true; };
    const up = (e: KeyboardEvent) => { const p = play.current; if (!p) return; p.keys[e.key] = false; if (e.key === " " && role === "shaker") letGo(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [mine?.id, mine?.go, role]);
  function letGo() {
    const p = play.current;
    if (!p) return;
    p.held = false;
    // let go at full bend: what is on the branch falls (a let-go too soon shakes off nothing)
    if (p.bend >= 0.8 && p.drops < 3) { p.drops += 1; pairing?.send(mine!.holder ?? "", { sk: mine!.id, bend: 0, drop: p.drops }); }
  }
  const dragSheet = useRef<{ x: number; from: number } | null>(null);
  const onSheet = (phase: "down" | "move" | "up") => (e: Press<HTMLElement>) => {
    const p = play.current; if (!p) return;
    if (phase === "down") { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); dragSheet.current = { x: e.clientX, from: p.sheet }; return; }
    if (phase === "up") { dragSheet.current = null; return; }
    if (!dragSheet.current) return;
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    p.sheet = Math.max(40, Math.min(SW - 40, dragSheet.current.from + ((e.clientX - dragSheet.current.x) / b.width) * SW * 1.2));
  };
  const onTap = (e: Press<HTMLCanvasElement>) => { if (role !== "shaker" || !mine?.holder) return; const q = toScene(e, SW, SH); pairing?.send(mine.holder, { sk: mine.id, tap: [Math.round(q.x), Math.round(q.y)], drop: play.current?.drops }); };

  // my insect of a shake that caught some, had at once
  const claimedRef = useRef<string | null>(null);
  useEffect(() => { if (mine && mine.end && mine.caught > 0 && !mine.claimed.includes(me) && claimedRef.current !== mine.id) { claimedRef.current = mine.id; void shakeDo("claim", BOARD_SPOTS[mine.spot], { id: mine.id }); } });

  // ── what shows ──
  const rollSpot = roll ? BOARD_SPOTS[roll.spot] : null;
  if (roll && rollSpot) {
    const open = roll.cut.every(Boolean), left = roll.cut.filter((c) => !c).length, wait = roll.opened + BOARD.unrollMin - keeper.now();
    return <TownFoot rank="board" wide order={62}>
      <section className={`tk tk-plate pointer-events-auto ${s.panel} ${g.fit}`} data-board-insects="roll" aria-label={th ? "ใบไม้ม้วน" : "A rolled leaf"}>
        <header className={s.title}><TownIcon name="leafRoll" size={26} /><h3 className="font-display text-ui font-semibold">{th ? "ใบไม้ม้วน" : "A rolled leaf"}</h3>
          <button type="button" className={`${WOOD} grid min-w-11 place-items-center px-0`} aria-label={th ? "ปิด" : "Close"} onClick={() => { setRoll(null); setSaid(null); }}><TownIcon name="close" size={16} /></button></header>
        <div className={s.stage}>
          <canvas ref={rollCanvas} width={RW} height={RH} className={`${s.canvas} ${g.scene}`} style={{ aspectRatio: `${RW} / ${RH}`, touchAction: "none" }} onPointerDown={onRoll("down")} onPointerMove={onRoll("move")} onPointerUp={onRoll("up")} onPointerCancel={onRoll("up")} />
          {!open && <div className={g.tag}>{th ? `ตัดใยแล้ว ${SEAMS.length - left}/${SEAMS.length}` : `Seams cut ${SEAMS.length - left}/${SEAMS.length}`}</div>}
        </div>
        {roll.got ? <div role="status" className={s.done}><p className={s.big}>{th ? "ได้ " : "Got "}<span className={s.got}><TownIcon name={roll.got as IconName} size={22} />{nameOf(roll.got, th)}</span></p>
            <p className={g.left}>{turnWords}</p>
            <button type="button" className={`${WOOD} w-full`} onClick={() => setRoll(null)}>{th ? "ปิด" : "Close"}</button></div>
          : open ? <div className={s.row}><button type="button" data-board-cup className={`${GREEN} flex-1`} disabled={busy || wait > 0} onClick={() => void cupRoll()}><TownIcon name="jar" size={22} />{wait > 0 ? (th ? "ค่อยๆ ครอบ…" : "Gently…") : th ? `ครอบ${nameOf(roll.held, th)}` : `Cup the ${nameOf(roll.held, th).toLowerCase()}`}</button></div>
          : <p className={g.hint}>{th ? "ลากตามใยสีขาวทีละเส้นเพื่อตัด (ลากขวางใบ ตัวข้างในจะตกใจ)" : "Drag along each white seam to cut it (across the leaf startles what is inside)"}</p>}
        {said && <p role="status" className={s.said}>{said}</p>}
      </section>
    </TownFoot>;
  }
  if (mine) {
    const spot = BOARD_SPOTS[mine.spot], calling = mine.go === 0, callsLeft = GIANT.calls - mine.calls.length, callWait = mine.calls.length ? mine.calls[mine.calls.length - 1] + GIANT.callGap - now : 0;
    const sendCall = async (words: string) => { const w = callWords(words); if (!w) { say(words.trim() ? "long" : "empty"); return; } const did = await shakeDo("text", spot, { id: mine.id, text: w }); if (did) setText(""); };
    const crew = <ul className={g.crew}>
      <li className={g.mate} data-me={mine.by === me || undefined}><b><TownIcon name="knottedWood" size={14} />{mine.by === me ? (th ? "คุณ" : "You") : mine.byName}</b><em>{th ? "เขย่า" : "Shaker"}</em></li>
      <li className={g.mate} data-me={mine.holder === me || undefined} data-free={!mine.holder || undefined}><b><TownIcon name="beatSheet" size={14} />{mine.holder ? (mine.holder === me ? (th ? "คุณ" : "You") : mine.holderName) : (th ? "ว่าง" : "Free")}</b><em>{th ? "ถือผ้า" : "Sheet"}</em></li>
    </ul>;
    const ended = !!mine.end || (mine.go > 0 && now > mine.go + BOARD.shake + 5_000), shakeLeft = mine.go > 0 ? mine.go + BOARD.shake - now : 0;
    if (calling && role === "shaker" && small === mine.id) return <TownFoot rank="chip" order={28}>
      <button className={`${OPEN} ${g.pill}`} data-board-small onClick={() => setSmall(null)} aria-label={th ? "เปิดกระดานเขย่ากิ่ง" : "Open the shake's board"}>
        <TownIcon name="twigBugs" size={26} /><span>{th ? "รอคนถือผ้า" : "Waiting for a sheet holder"}<small> · {clock(mine.at + BOARD.call - now)}</small></span>
        <TownIcon name="chevron" size={12} className="rotate-180" />
      </button>
    </TownFoot>;
    return <TownFoot rank="board" wide order={62}>
      <section className={`tk tk-plate pointer-events-auto ${s.panel} ${g.fit}`} data-board-insects={calling ? "call" : ended ? "over" : role} aria-label={th ? "เขย่ากิ่ง" : "Shaking a branch"}>
        <header className={s.title}><TownIcon name="twigBugs" size={26} /><h3 className="font-display text-ui font-semibold">{ended ? (mine.caught ? (th ? "ได้แมลง!" : "Caught!") : (th ? "แมลงหนีไปหมด" : "They all got away")) : role === "holder" ? (th ? "เขย่ากิ่ง · ถือผ้า" : "Shaking · the sheet") : (th ? "เขย่ากิ่ง" : "Shaking a branch")}</h3>
          {calling && role === "shaker" && <button type="button" className={`${WOOD} ml-auto flex items-center gap-1.5`} data-board-fold onClick={() => setSmall(mine.id)}>{th ? "พับเก็บ" : "Fold away"}<TownIcon name="chevron" size={12} /></button>}
          {(ended || calling) && <button type="button" className={`${WOOD} grid min-w-11 place-items-center px-0`} aria-label={th ? "ปิด" : "Close"} onClick={() => setShut((was) => [...was, mine.id])}><TownIcon name="close" size={16} /></button>}</header>
        {!calling && <div className={s.stage}>
          <canvas ref={shakeCanvas} width={SW} height={SH} className={`${s.canvas} ${g.scene}`} style={{ aspectRatio: `${SW} / ${SH}`, touchAction: "none" }} onPointerDown={onTap} />
          {!ended && (() => { const n = role === "holder" ? play.current?.cups ?? 0 : play.current?.seen?.cups ?? 0; return <div className={g.tag}>{th ? `ครอบแล้ว ${n}` : `Cupped ${n}`}</div>; })()}
          {!ended && <div className={g.bar} data-tone={shakeLeft < 10_000 ? "warn" : undefined}><b>{Math.max(0, Math.ceil(shakeLeft / 1000))}</b><i><span style={{ width: `${Math.max(0, Math.min(100, (shakeLeft / BOARD.shake) * 100))}%` }} /></i></div>}
        </div>}
        {crew}
        {calling && role === "shaker" && <>
          <p className={s.note}>{th ? "ต้องมีอีกคนถือผ้ารองใต้กิ่ง" : "Somebody must hold the sheet under the branch"}</p>
          <form className={g.call} onSubmit={(e) => { e.preventDefault(); void sendCall(text); }}>
            <label className={g.callHead} htmlFor="shake-call"><TownIcon name="chat" size={16} />{th ? "เรียกเพื่อนทั้งเมือง" : "Call the whole town"}</label>
            <div className={g.callRow}><input id="shake-call" className={g.input} value={text} maxLength={GIANT.callLen} placeholder={th ? "พิมพ์เรียกเพื่อนมาถือผ้า" : "Call a friend to hold the sheet"} onChange={(e) => setText(e.target.value)} disabled={callsLeft <= 0} />
              <button type="submit" className={`${WOOD} min-w-16`} disabled={busy || callsLeft <= 0 || callWait > 0}>{th ? "ส่ง" : "Send"}</button></div>
            <div className={g.chips}>{CHIPS.map((c) => <button key={c[0]} type="button" className={g.chip} disabled={busy || callsLeft <= 0 || callWait > 0} onClick={() => void sendCall(c[lang])}>{c[lang]}</button>)}</div>
            <small className={g.left}>{callsLeft <= 0 ? (th ? "เรียกครบ 3 ครั้งแล้ว" : "All three calls sent") : callWait > 0 ? (th ? `เรียกได้อีก ${callsLeft} ครั้ง · อีก ${Math.ceil(callWait / 1000)} วิ` : `${callsLeft} calls left · in ${Math.ceil(callWait / 1000)} s`) : (th ? `เรียกได้อีก ${callsLeft} ครั้ง` : `${callsLeft} calls left`)}</small>
          </form>
        </>}
        {!calling && !ended && role === "shaker" && <>
          <button type="button" data-board-bend className={`${g.hold} w-full`} data-open={play.current?.held || undefined} onPointerDown={() => { if (play.current) play.current.held = true; }} onPointerUp={letGo} onPointerLeave={() => { if (play.current?.held) letGo(); }} onPointerCancel={letGo}><TownIcon name="knottedWood" size={26} /><span>{th ? "กดค้างโน้มกิ่ง · ปล่อยตอนโค้งสุด" : "Hold to bend · let go at full bend"}</span></button>
          <p className={g.hint}>{th ? "แมลงบนผ้าจะวิ่งหนี แตะที่ตัวมันเพื่อครอบก่อนหลุดขอบ" : "On the sheet they run: tap them before they reach its edge"}<span className={g.keys}> · Space</span></p>
        </>}
        {!calling && !ended && role === "holder" && <>
          <div className={g.drag} data-board-sheet onPointerDown={onSheet("down")} onPointerMove={onSheet("move")} onPointerUp={onSheet("up")} onPointerCancel={onSheet("up")}><TownIcon name="beatSheet" size={24} /><span>{th ? "◂ เลื่อนผ้า ▸" : "◂ move the sheet ▸"}</span></div>
          <p className={g.hint}>{th ? "รับแมลงที่ร่วงลงมา เพื่อนจะแตะครอบตัวที่วิ่งบนผ้า" : "Catch what falls; your friend cups what runs on the sheet"}<span className={g.keys}> · ← →</span></p>
        </>}
        {ended && <div role="status" className={s.done}>
          {mine.caught > 0 ? <p>{!mine.claimed.includes(me) ? (th ? "กำลังรับแมลง…" : "Taking yours…") : mine.caught >= BOARD.drops ? (th ? "รับได้ครบ 2 ตัว ได้แมลงคนละ 2 ตัว!" : "Both caught: two insects each!") : (th ? "ได้แมลงคนละ 1 ตัวแล้ว · รับครบ 2 ตัวจะได้คนละ 2" : "One insect each · catch both for two each")}</p> : <p>{th ? "ลองใหม่ได้ ถ้าต้นนี้ยังมีแมลง" : "Try again while the tree still has some"}</p>}
          <p className={g.left}>{turnWords}</p>
          {/* (refused, a full bag say: taken again by hand once there is room) */}
          {mine.caught > 0 && !mine.claimed.includes(me) && claimedRef.current === mine.id && !busy && <button type="button" className={`${GREEN} w-full`} onClick={() => void shakeDo("claim", spot, { id: mine.id })}>{th ? "รับแมลงอีกครั้ง" : "Take it again"}</button>}
        </div>}
        {said && <p role="status" className={s.said}>{said}</p>}
      </section>
    </TownFoot>;
  }
  // near a spot that holds something now: the way to begin; near a called shake: the sheet to hold
  const calledNear = shakes.find((x) => !x.go && !x.end && x.by !== me && now < x.at + BOARD.call && nearSpot(BOARD_SPOTS[x.spot], at));
  if (calledNear) return <TownFoot rank="chip" order={28}><button className={OPEN} data-board-join disabled={busy} onClick={() => void shakeDo("join", BOARD_SPOTS[calledNear.spot], { id: calledNear.id })}><TownIcon name="beatSheet" size={26} />{th ? `ช่วย ${calledNear.byName} ถือผ้ารอง` : `Hold the sheet for ${calledNear.byName}`}</button>{said && <p role="status" className={s.said}>{said}</p>}</TownFoot>;
  const near = BOARD_SPOTS.find((x) => nearSpot(x, at) && holds(x));
  if (!near) return null;
  return <TownFoot rank="chip" order={28}>
    {near.board === "roll"
      ? <button className={OPEN} data-board-open disabled={busy} onClick={() => void openRollAt(near)}><TownIcon name="leafRoll" size={26} />{th ? "แกะใบไม้ม้วน" : "Unroll the leaf"}</button>
      : <button className={OPEN} data-board-call disabled={busy} onClick={() => void shakeDo("call", near)}><TownIcon name="twigBugs" size={26} />{th ? "เขย่ากิ่ง (ต้องมีคนถือผ้า)" : "Shake the branch (needs a sheet holder)"}</button>}
    {said && <p role="status" className={s.said}>{said}</p>}
  </TownFoot>;
}
