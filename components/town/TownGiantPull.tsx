"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent as Press } from "react";
import type { Keeper } from "@/lib/town/keeper";
import { deedFor, type Plot } from "@/lib/town/farm";
import { handOf } from "@/lib/town/trade";
import type { Stander } from "@/lib/town/line";
import { ITEMS } from "@/lib/town/items";
import { bedOf } from "@/lib/town/world";
import { PULL, calling, goEnds, gripOf, judgePull, leanAt, peakAt, pullOf, pullable, pulling, sideOf, type GiantPull, type PullRefusal } from "@/lib/town/giant-pull";
import ART from "@/lib/town/giant-pull-art.json";
import { daylight, daylightAt } from "@/lib/town/daylight";
import TownFoot from "./TownFoot";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import s from "./TownGiantPull.module.css";

/**
 * A giant pulled out together (lib/town/giant-pull; the owner, 2026-10-27: "ทำให้มีมินิเกมเล่นหลายคน ช่วยกันดึงผัก ...
 * ทำ UI gameplay ออกมาดีๆได้เลย"). Its keeper calls at the ripe giant, whoever stands near joins with a tap, and the
 * crew rock it loose on one clock: the giant leans left and right over the cut-away bed (its own scene, scripts/pixel's
 * scene-giant-pull-game), and each of the crew pulls the rope on the side it leans to as it leans farthest. The board is
 * a canvas at the scene's own pixels, laid up without smoothing, so the giant's own picture (the atlas's) and the
 * pieces thrown about (icons-giant-pull-a: soil clods, a snapped root, dust, the pit) keep their pixels.
 *
 * Each page judges its own presses at the press and reports them (`hits`) every few good pulls; what the others have
 * pulled is seen as it happens by the word each of the crew says to the room (`pull`, lib/town/room), and for good when
 * a report comes back with the plot.
 */
const SCENE = "/town/giant-pull-d188046275.png";
const PIECES = `/town/giant-pull/${ART.image.split("/").pop()}`;
type Piece = keyof typeof ART.icons;
/** The scene's own pixels, and where on it the giant stands: its foot on the mound's middle, sunk a little into it. */
const W = 266, H = 177, MID = 133, FOOT = 112, HANDS = 66;
const REPORT_EVERY = 3;
const WOOD = "pressable tk tk-btn-wood min-h-11 px-3 text-ui font-semibold disabled:opacity-50";
const GREEN = "pressable tk tk-btn flex min-h-12 items-center justify-center gap-2 font-display text-ui font-semibold disabled:opacity-50";
const OPEN = "pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full border-2 border-[#f0c060] bg-[#3a2513]/95 py-1 pl-2 pr-4 text-ui font-semibold text-[#ffeccb] shadow-xl shadow-black/40";

const giantIcon = (crop: string) => `giant${crop[0].toUpperCase()}${crop.slice(1)}B` as IconName;
/** A piece of the board's own small picture, as TownIcon draws one of the town's. */
function PullIcon({ name, size }: { name: Piece; size: number }) {
  const [x, y, w, h] = ART.icons[name], k = size / Math.max(w, h);
  return <span aria-hidden className="inline-block shrink-0 align-middle" style={{ width: w * k, height: h * k, backgroundImage: `url(${PIECES})`, backgroundPosition: `${-x * k}px ${-y * k}px`, backgroundSize: `${ART.size[0] * k}px ${ART.size[1] * k}px`, imageRendering: "pixelated" }} />;
}

/** A call or a go still worth a board: called, under way, just run out (the caller may call again), or just out. */
const lively = (pull: GiantPull, now: number) => calling(pull, now) || (pull.go > 0 && !pull.out && now <= goEnds(pull.go) + PULL.grace + PULL.call) || (pull.out > 0 && now - pull.out < 60_000);
/** The giant whose call or go I am in, anywhere on the farm; else the one whose 2x2 I stand at or beside. */
function giantOf(plots: Record<string, Plot>, me: string, at: [number, number] | null, now: number): string | null {
  for (const [key, plot] of Object.entries(plots)) {
    const pull = plot.plant?.giant && plot.plant.root === key ? plot.plant.pull : undefined;
    if (pull && pull.crew.includes(me) && lively(pull, now)) return key;
  }
  if (!at) return null;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const p = plots[`${at[0] + dx},${at[1] + dy}`]?.plant;
    if (p?.giant && p.root && plots[p.root]?.plant?.giant) return p.root;
  }
  return null;
}
/** What a member of the crew says of the giant (lib/town/room's `pull`): its start as they know it and their good pulls. */
function wordOf(word: string | undefined, root: string): { go: number; n: number } | null {
  const m = word?.match(/^(\d+,\d+):(\d+):(\d+)$/);
  return m && m[1] === root ? { go: Number(m[2]), n: Number(m[3]) } : null;
}
const REFUSED: Record<PullRefusal, [string, string]> = {
  none: ["ยังถอนต้นนี้ไม่ได้", "This giant cannot be pulled now"],
  theirs: ["เจ้าของแปลงเท่านั้นที่เรียกดึงและเริ่มดึงได้", "Only the bed's keeper calls and starts the pull"],
  busy: ["มีคนกำลังดึงต้นนี้อยู่", "Someone is already pulling this giant"],
  shut: ["หมดเวลาเรียกคนแล้ว", "The call is over"],
  full: ["ทีมดึงเต็มแล้ว (4 คน)", "The crew is full (four)"],
  in: ["อยู่ในทีมดึงแล้ว", "You are in the crew"],
  crew: ["ไม่ได้อยู่ในทีมดึงต้นนี้", "You are not in this crew"],
  late: ["หมดจังหวะดึงแล้ว", "The pull is over"],
  done: ["ต้นนี้ถูกถอนขึ้นมาแล้ว", "This giant is already out"],
};

interface Bit { piece: Piece; sx: number; sy: number; sw: number; sh: number; x: number; y: number; vx: number; vy: number; born: number; life: number }

export default function TownGiantPull({ keeper, th, at, name, people, sayPull, hour = null }: {
  keeper: Keeper; th: boolean; at: [number, number] | null; name: string;
  /** The hour the town is shown at in `next dev` (Town's forcedHour), else null: the board takes the town's light. */
  hour?: number | null;
  people?: () => Stander[];
  /** Tell the room of the giant I help pull (lib/town/session's setPull). */
  sayPull?: (word: string) => void;
}) {
  const me = keeper.id;
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [shut, setShut] = useState<string | null>(null);
  const [harvest, setHarvest] = useState<{ key: string; got: Array<[string, number]> | null; why?: string } | null>(null);
  // (the giant once out, kept here: its keeper's pick takes it off the plot, and the card stays till it is closed)
  const [result, setResult] = useState<{ key: string; crop: string; by: string; helped: string[]; crew: string[]; out: number; hits: Record<string, number[]> } | null>(null);
  const lit = useRef<{ left: HTMLButtonElement | null; right: HTMLButtonElement | null }>({ left: null, right: null });
  // (what I pulled well in this go, the half-swings I have pressed at, and how many of them the keeper has been told)
  const go = useRef<{ key: string; go: number; mine: Set<number>; used: Set<number>; told: number; flash: { side: 1 | -1; at: number; good: boolean } | null; bits: Bit[]; looked: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const pics = useRef<{ scene: HTMLImageElement; pieces: HTMLImageElement; atlas: HTMLImageElement } | null>(null);

  useEffect(() => {
    const again = () => tick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 250);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);

  const now = keeper.now(), plots = keeper.farm();
  const found = giantOf(plots, me, at, now), key = found ?? result?.key ?? null;
  const plot = key ? plots[key] : undefined, plant = plot?.plant ?? null, pull = pullOf(plot);
  // (a board closed stays closed for that call: a later call at the same giant is another)
  const tag = key ? `${key}:${pull?.at ?? result?.out ?? 0}` : null;
  const crop = plant?.crop ?? result?.crop ?? "pumpkin", cropName = ITEMS[crop as keyof typeof ITEMS]?.name[th ? "th" : "en"] ?? crop;
  const inCrew = !!pull && pull.crew.includes(me);
  const nameOf = useCallback((id: string) => id === me ? (th ? "คุณ" : "You") : people?.().find((p) => p.id === id)?.name ?? (th ? "เพื่อน" : "A friend"), [me, people, th]);
  const words = people?.() ?? [];
  // (the start as anybody of the crew knows it: the plot's, or sooner the caller's word)
  const goAt = pull ? Math.max(pull.go, pull.go === 0 && pull.out === 0 ? wordOf(words.find((p) => p.id === pull.by)?.pull, key!)?.go ?? 0 : 0) : 0;
  const isCalling = calling(pull, now) && goAt === 0;
  const isPulling = !!pull && !pull.out && goAt > 0 && now <= goEnds(goAt) + PULL.grace;
  const ranOut = !!pull && !pull.out && goAt > 0 && !isPulling;
  const isOut = !!pull?.out || (!!result && result.key === key && !pull);
  const lapsed = !!pull && !pull.out && goAt === 0 && !isCalling;
  if (pull?.out && inCrew && key && (!result || result.key !== key || result.out !== pull.out)) setResult({ key, crop, by: pull.by, helped: pull.helped ?? [], crew: pull.crew, out: pull.out, hits: pull.hits });
  const mine = go.current && go.current.key === key && go.current.go === goAt ? go.current.mine : null;

  // ── the go's own book: begun afresh with each start ──
  if (key && isPulling && inCrew && (!go.current || go.current.key !== key || go.current.go !== goAt)) {
    go.current = { key, go: goAt, mine: new Set(pull!.hits[me] ?? []), used: new Set(pull!.hits[me] ?? []), told: (pull!.hits[me] ?? []).length, flash: null, bits: [], looked: 0 };
  }
  // what the roots still hold: the keeper's count, my own pulls not told yet, and what the others say they have pulled
  const stored = pull?.hits ?? result?.hits ?? {};
  let done = gripOf(mine ? { ...stored, [me]: [...mine] } : stored).done;
  if (pull && !isOut) for (const id of pull.crew) if (id !== me) {
    const w = wordOf(words.find((p) => p.id === id)?.pull, key!), have = stored[id]?.length ?? 0;
    if (w && w.go === goAt && w.n > have) done += w.n - have;
  }
  if (isOut) done = PULL.grip;
  const left = Math.max(0, PULL.grip - done);

  // ── what I say to the room: the giant, the start, my good pulls ──
  const word = key && inCrew && (isCalling || isPulling) ? `${key}:${goAt}:${mine?.size ?? 0}` : "";
  useEffect(() => { sayPull?.(word); }, [word, sayPull]);
  useEffect(() => () => sayPull?.(""), [sayPull]);

  const send = useCallback(async (action: "open" | "join" | "leave" | "go") => {
    if (!key || busy) return;
    const [x, y] = key.split(",").map(Number);
    setBusy(true); setSaid(null);
    try {
      const did = await keeper.giantPull(action, [x, y]);
      if (!did.ok) setSaid(REFUSED[did.why as PullRefusal]?.[th ? 0 : 1] ?? (th ? "ทำไม่ได้ตอนนี้" : "Not now"));
      else if (action === "leave") setShut(tag);
      else setShut(null);
    } finally { setBusy(false); }
  }, [key, tag, busy, keeper, th]);

  // ── reporting what I pulled well: every few good pulls, when the roots look loose, and when the go is over ──
  const report = useCallback(async (force = false) => {
    const g = go.current;
    if (!g || !key) return;
    if (g.mine.size <= g.told && !force) return;
    const [x, y] = key.split(",").map(Number), hits = [...g.mine].sort((a, b) => a - b), size = hits.length;
    const did = await keeper.giantPull(size > g.told || !force ? "hits" : "look", [x, y], hits);
    if (did.ok && size > g.told) g.told = size;
  }, [key, keeper]);
  useEffect(() => {
    if (!isPulling || !inCrew) return;
    const g = go.current;
    if (!g) return;
    if (left <= 0 && g.mine.size > g.told) void report();
    // (the roots look loose, or the go is past its last half-swing: ask how it stands, now and then)
    if ((left <= 0 || now > goEnds(goAt)) && now - g.looked > 900) { g.looked = now; void report(true); }
  });

  // ── a press: judged at the press, by the clock the giant rocks by ──
  const press = useCallback((side: 1 | -1, stamp: number) => {
    const g = go.current;
    if (!g || !isPulling) return;
    const at_ = keeper.now() - Math.max(0, performance.now() - stamp);
    const j = judgePull(g.go, at_, side);
    if (!j || g.used.has(j.k)) return;
    g.used.add(j.k);
    g.flash = { side, at: performance.now(), good: j.good };
    const base = { x: MID + side * 18, y: FOOT - 6 };
    if (j.good) {
      g.mine.add(j.k);
      // soil torn up on the side pulled to: the clods' four lumps each flung its own way
      const [, , cw, ch] = ART.icons.pullClods, hw = Math.floor(cw / 2), hh = Math.floor(ch / 2);
      [[0, 0], [hw, 0], [0, hh], [hw, hh]].forEach(([ox, oy], i) => g.bits.push({ piece: "pullClods", sx: ox, sy: oy, sw: cw - hw, sh: ch - hh, x: base.x, y: base.y,
        vx: side * (20 + i * 14) + (i % 2 ? 8 : -8), vy: -(70 + (i * 23) % 40), born: performance.now(), life: 650 }));
      // and now and then a root gives way: its two halves fly apart
      if (g.mine.size % 3 === 0) {
        const [, , rw, rh] = ART.icons.pullRoot, half = Math.floor(rw / 2);
        g.bits.push({ piece: "pullRoot", sx: 0, sy: 0, sw: half, sh: rh, x: MID - 14, y: FOOT, vx: -40, vy: -55, born: performance.now(), life: 800 });
        g.bits.push({ piece: "pullRoot", sx: half, sy: 0, sw: rw - half, sh: rh, x: MID + 14, y: FOOT, vx: 40, vy: -55, born: performance.now(), life: 800 });
      }
      if (g.mine.size - g.told >= REPORT_EVERY) void report();
    } else {
      // a slip: a little dust where the feet scuffed
      const [, , dw, dh] = ART.icons.pullDust;
      g.bits.push({ piece: "pullDust", sx: 0, sy: 0, sw: dw, sh: dh, x: MID + side * 60, y: FOOT - 2, vx: side * 12, vy: -18, born: performance.now(), life: 500 });
    }
    tick((n) => n + 1);
  }, [isPulling, keeper, report]);
  const onPress = (side: 1 | -1) => (e: Press<HTMLButtonElement>) => { if (e.button === 0) press(side, e.nativeEvent.timeStamp || performance.now()); };
  useEffect(() => {
    if (!isPulling || !inCrew) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) return;
      const side = e.key === "ArrowLeft" || e.key === "a" || e.key === "A" ? -1 : e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : 0;
      if (!side) return;
      e.preventDefault();
      press(side as 1 | -1, e.timeStamp || performance.now());
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [isPulling, inCrew, press]);

  // ── the moment it comes out: the earth thrown up from its pit ──
  const burst = useRef<string | null>(null);
  useEffect(() => {
    const g = go.current, out = pull?.out ?? 0;
    if (!key || !out || !g || g.key !== key || burst.current === `${key}:${out}`) return;
    burst.current = `${key}:${out}`;
    const [, , cw, ch] = ART.icons.pullClods, hw = Math.floor(cw / 2), hh = Math.floor(ch / 2), [, , rw, rh] = ART.icons.pullRoot, half = Math.floor(rw / 2), born = performance.now();
    for (const side of [-1, 1]) [[0, 0], [hw, 0], [0, hh], [hw, hh]].forEach(([ox, oy], i) => g.bits.push({ piece: "pullClods", sx: ox, sy: oy, sw: cw - hw, sh: ch - hh, x: MID + side * 8, y: FOOT,
      vx: side * (26 + i * 18), vy: -(110 + (i * 31) % 50), born: born + i * 30, life: 900 }));
    g.bits.push({ piece: "pullRoot", sx: 0, sy: 0, sw: half, sh: rh, x: MID - 10, y: FOOT, vx: -55, vy: -95, born, life: 1000 });
    g.bits.push({ piece: "pullRoot", sx: half, sy: 0, sw: rw - half, sh: rh, x: MID + 10, y: FOOT, vx: 55, vy: -95, born, life: 1000 });
  }, [key, pull?.out]);

  // ── the grower's harvest, once it is out ──
  const picking = useRef<string | null>(null);
  const [pickTry, setPickTry] = useState(0);
  useEffect(() => {
    if (!key || !pull?.out || pull.by !== me || picking.current === `${key}:${pull.out}`) return;
    picking.current = `${key}:${pull.out}`;
    void (async () => {
      // (only a pick: whatever is in the hand might make the same tap something else, compost on it or a hoe's digging)
      const [kx, ky] = key.split(",").map(Number), owner = keeper.owners().get(bedOf(kx, ky))?.by ?? null;
      if (deedFor(key, plot!, handOf(keeper.purse()), me, keeper.now(), owner, keeper.rains()) !== "pick") { setHarvest({ key, got: null, why: "hand" }); return; }
      const did = await keeper.farmDo(key, name);
      setHarvest(did.ok && did.deed === "pick" ? { key, got: did.got as Array<[string, number]> } : { key, got: null, why: did.ok ? "hand" : did.why });
    })();
  }, [key, pull, plot, me, keeper, name, pickTry]);

  // ── the board's picture ──
  useEffect(() => {
    if (!pics.current) {
      const img = (src: string) => { const i = new Image(); i.src = src; return i; };
      pics.current = { scene: img(SCENE), pieces: img(PIECES), atlas: img(ICON_ATLAS.image) };
    }
  }, []);
  const show = !!key && shut !== tag && ((inCrew && (isCalling || isPulling || ranOut || lapsed || !!pull?.out)) || (!!result && result.key === key));
  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvas.current, P = pics.current, ctx = c?.getContext("2d");
      if (!c || !P || !ctx || !P.scene.complete) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(P.scene, 0, 0, W, H);
      const t = keeper.now(), pt = performance.now(), cell = ICON_ATLAS.icons[giantIcon(crop)];
      const g = go.current && go.current.key === key ? go.current : null;
      const loose = done / PULL.grip;
      if (isOut) {
        // out: the pit where it stood, and the giant lying on its side beside it
        const [px, py, pw, ph] = ART.icons.pullPit;
        if (P.pieces.complete) ctx.drawImage(P.pieces, px, py, pw, ph, MID - Math.round(pw / 2), FOOT - ph + 6, pw, ph);
        if (cell && P.atlas.complete) {
          // (up out of the ground in an arc and set down upright on the soil beside its pit, whole pixels all the way)
          const [sx, sy, sw, sh] = cell, since = Math.min(1, (t - (pull?.out ?? result?.out ?? t)) / 800), arc = Math.sin(Math.PI * since);
          const x = Math.round(MID - sw / 2 + (sw / 2 + 22) * since), y = Math.round(FOOT + 4 - sh - arc * 34 - (1 - since) * 4);
          ctx.drawImage(P.atlas, sx, sy, sw, sh, x, y, sw, sh);
        }
      } else if (cell && P.atlas.complete) {
        // standing: rocked on the shared clock (or stirring in the breeze while the crew gathers), more as the roots give
        const [sx, sy, sw, sh] = cell;
        const lean = goAt > 0 ? leanAt(goAt, t) : Math.sin(pt / 900) * 0.12;
        const top = FOOT - sh - Math.round(3 * loose), reach = (4 + 9 * loose) * lean;
        for (let r = 0; r < sh; r++) {
          const shift = Math.round(reach * Math.pow(1 - r / sh, 1.3));
          ctx.drawImage(P.atlas, sx, sy + r, sw, 1, MID - Math.round(sw / 2) + shift, top + r, sw, 1);
        }
        // the ropes: from the giant's shoulders to the crew's hands at either side, slack until somebody heaves
        const knot = { x: MID + Math.round(reach * 0.55), y: top + Math.round(sh * 0.38) };
        for (const side of [-1, 1] as const) {
          const taut = g?.flash && g.flash.side === side && g.flash.good && pt - g.flash.at < 220 ? 1 : 0.15 + 0.35 * Math.max(0, side * lean);
          rope(ctx, knot.x + side * Math.round(sw * 0.28), knot.y, side < 0 ? -2 : W + 2, HANDS, (1 - taut) * 12);
        }
      }
      // the rope that leans lights as the giant nears its farthest lean that way, so the moment can be seen coming
      const L = lit.current;
      if (goAt > 0 && !isOut) {
        const u = (t - goAt - PULL.count) / PULL.swing, kk = Math.round(u - 0.5), on = u > 0 && kk < PULL.swings ? Math.max(0, 1 - Math.abs(t - peakAt(goAt, kk)) / (PULL.swing / 2)) : 0;
        L.left?.style.setProperty("--lit", (sideOf(kk) < 0 ? on : 0).toFixed(2));
        L.right?.style.setProperty("--lit", (sideOf(kk) > 0 ? on : 0).toFixed(2));
      }
      // what was torn up: each bit flung, falling, gone
      if (g && P.pieces.complete) {
        g.bits = g.bits.filter((b) => pt - b.born < b.life);
        for (const b of g.bits) {
          const sec = (pt - b.born) / 1000, [ix, iy] = ART.icons[b.piece];
          ctx.globalAlpha = Math.max(0, 1 - (pt - b.born) / b.life) ** 0.6;
          ctx.drawImage(P.pieces, ix + b.sx, iy + b.sy, b.sw, b.sh, Math.round(b.x + b.vx * sec - b.sw / 2), Math.round(b.y + b.vy * sec + 160 * sec * sec - b.sh), b.sw, b.sh);
        }
        ctx.globalAlpha = 1;
      }
      // the town's light, as the map is lit: everything drawn multiplied by the sky's tint (white at noon)
      const sky = (hour !== null ? daylightAt(hour * 60) : daylight()).tint;
      if (sky[0] + sky[1] + sky[2] < 765) {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgb(${sky[0]},${sky[1]},${sky[2]})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [show, key, crop, isOut, goAt, done, pull, result, keeper, hour]);

  // ── what shows where ──
  const near = !!key && !!at && (() => { const [kx, ky] = key.split(",").map(Number); return Math.abs(at[0] - kx - 0.5) <= 2.5 && Math.abs(at[1] - ky - 0.5) <= 2.5; })();
  const keeperOf = key ? (() => { const [kx, ky] = key.split(",").map(Number); return keeper.owners().get(bedOf(kx, ky))?.by ?? null; })() : null;
  const mayCall = !!key && !!plant && (keeperOf === null || keeperOf === me) && pullable(key, plot, now, keeper.rains()) && !isCalling && !isPulling;
  const mayJoin = !!key && isCalling && !inCrew && near && pull!.crew.length < PULL.crew;
  if (!show) {
    if (mayCall && near && !ranOut) return <TownFoot rank="main" order={58}>
      <button className={OPEN} data-giant-pull-open disabled={busy} onClick={() => void send("open")}><PullIcon name="pullKnot" size={26} />{th ? `ถอน${cropName}ยักษ์` : `Pull the giant ${cropName.toLowerCase()}`}</button>
      {said && <p role="status" className={s.said}>{said}</p>}
    </TownFoot>;
    if (mayJoin) return <TownFoot rank="chip" order={28}>
      <button className={OPEN} data-giant-pull-join disabled={busy} onClick={() => void send("join")}><PullIcon name="pullGloves" size={26} />{th ? `ช่วย${nameOf(pull!.by)}ดึง${cropName}ยักษ์` : `Help ${nameOf(pull!.by)} pull`}</button>
      {said && <p role="status" className={s.said}>{said}</p>}
    </TownFoot>;
    if (ranOut && pull!.by === me && near) return <TownFoot rank="main" order={58}>
      <button className={OPEN} data-giant-pull-open disabled={busy} onClick={() => void send("open")}><PullIcon name="pullKnot" size={26} />{th ? "เรียกดึงอีกครั้ง" : "Call again"}</button>
    </TownFoot>;
    return null;
  }

  const crew = pull?.crew ?? result?.crew ?? [], by = pull?.by ?? result?.by ?? "";
  const grower = by === me, g = go.current && go.current.key === key ? go.current : null;
  const t = now, count = isPulling && t < goAt + PULL.count ? Math.ceil((goAt + PULL.count - t) / 1000) : 0;
  const k = isPulling ? Math.floor((t - goAt - PULL.count) / PULL.swing) : -1, swingsLeft = Math.max(0, PULL.swings - Math.max(0, k));
  const live = isPulling && count === 0;
  const crewChips = crew.map((id) => {
    const w = wordOf(words.find((p) => p.id === id)?.pull, key!), n = id === me ? Math.max(mine?.size ?? 0, stored[id]?.length ?? 0) : Math.max(w && w.go === goAt ? w.n : 0, stored[id]?.length ?? 0);
    return <li key={id} className={s.mate} data-me={id === me || undefined} data-grower={id === by || undefined}>
      <span className={s.mateName}>{id === by && <TownIcon name="thingGiantSeeds" size={12} />}{nameOf(id)}</span>
      {(isPulling || isOut) && <span className={s.pulls}>{n}</span>}
    </li>;
  });
  const helped = pull?.helped ?? result?.helped ?? [];
  return <TownFoot rank="board" icon="thingGiantSeeds" order={62}>
    <section className={`tk tk-plate pointer-events-auto ${s.panel}`} aria-label={th ? `ถอน${cropName}ยักษ์` : `Pulling the giant ${cropName}`} data-giant-pull={isOut ? "out" : isPulling ? (count ? "count" : "pull") : ranOut ? "ranout" : lapsed ? "lapsed" : "call"}>
      <header className={s.title}>
        <PullIcon name="pullKnot" size={26} />
        <h3 className="font-display text-ui font-semibold">{th ? `ถอน${cropName}ยักษ์` : `Pull the giant ${cropName.toLowerCase()}`}</h3>
        {(isOut || ranOut || lapsed) && <button type="button" className={`${WOOD} grid min-w-11 place-items-center px-0`} aria-label={th ? "ปิด" : "Close"} onClick={() => { setShut(tag); setHarvest(null); setResult(null); }}><TownIcon name="close" size={14} /></button>}
      </header>
      <div className={s.stage}>
        <canvas ref={canvas} width={W} height={H} className={s.canvas} />
        {count > 0 && <div className={s.count} key={count} aria-live="polite">{count}</div>}
        {isPulling && !count && t < goAt + PULL.count + 900 && <div className={s.count} data-go>{th ? "ดึง!" : "Pull!"}</div>}
        {g?.flash && performance.now() - g.flash.at < 450 && <div className={s.pop} data-side={g.flash.side} data-good={g.flash.good || undefined}>{g.flash.good ? (th ? "ฮึบ!" : "Heave!") : (th ? "หลุดจังหวะ" : "Slipped")}</div>}
        {(isPulling || isOut) && <div className={s.grip} aria-label={th ? `รากยึดเหลือ ${left} จาก ${PULL.grip}` : `Roots hold ${left} of ${PULL.grip}`}>
          <b>{th ? "รากยึด" : "Roots"}</b><i><span style={{ width: `${(left / PULL.grip) * 100}%` }} /></i>
        </div>}
      </div>
      <ul className={s.crew} aria-label={th ? "ทีมดึง" : "The crew"}>{crewChips}{isCalling && Array.from({ length: PULL.crew - crew.length }, (_, i) => <li key={`free${i}`} className={s.mate} data-free><span className={s.mateName}>{th ? "ว่าง" : "Free"}</span></li>)}</ul>

      {isCalling && <>
        <p className={s.note}>{th ? "ผักจะโยกซ้าย-ขวา ดึงเชือกฝั่งที่มันเอียงไปตอนเอียงสุด ดึงพร้อมกันได้แรงสามเท่า" : "It rocks left and right: pull the side it leans to, at its farthest. Together is three times the strength."}</p>
        <p className="mb-2 text-meta text-muted">{th ? `คนใกล้ ๆ มาช่วยได้อีก ${PULL.crew - crew.length} คน · คนละแรง 1` : `${PULL.crew - crew.length} more can help · 1 stamina each`}</p>
        {grower ? <div className={s.row}>
          <button type="button" data-giant-pull-go className={`${GREEN} flex-1`} disabled={busy} onClick={() => void send("go")}><PullIcon name="pullGloves" size={22} />{th ? "เริ่มดึง!" : "Start pulling!"}</button>
          <button type="button" className={WOOD} disabled={busy} onClick={() => void send("leave")}>{th ? "ยกเลิก" : "Cancel"}</button>
        </div> : <div className={s.row}>
          <p className={`${s.wait} flex-1`}>{th ? `รอ${nameOf(by)}เริ่มดึง…` : `Waiting for ${nameOf(by)} to start…`}</p>
          <button type="button" className={WOOD} disabled={busy} onClick={() => void send("leave")}>{th ? "ออก" : "Leave"}</button>
        </div>}
      </>}

      {isPulling && <>
        <div className={s.pullRow}>
          {([-1, 1] as const).map((side) => <button key={side} ref={(el) => { lit.current[side < 0 ? "left" : "right"] = el; }} type="button" data-giant-pull-side={side < 0 ? "left" : "right"} className={s.rope}
            disabled={!live} onPointerDown={onPress(side)} aria-label={side < 0 ? (th ? "ดึงเชือกซ้าย" : "Pull the left rope") : (th ? "ดึงเชือกขวา" : "Pull the right rope")}>
            <PullIcon name="pullGloves" size={30} /><span>{side < 0 ? (th ? "ดึงซ้าย" : "Left") : (th ? "ดึงขวา" : "Right")}</span>
          </button>)}
        </div>
        <p className="mt-1 text-center text-meta text-muted">{th ? `อีก ${swingsLeft} จังหวะ` : `${swingsLeft} swings left`}<span className={s.keys}>{th ? " · คีย์บอร์ด ← →" : " · keys ← →"}</span></p>
      </>}

      {lapsed && <>
        <p role="status" className={s.note} data-tone="miss">{th ? "หมดเวลาเรียกคนแล้ว" : "The call ran out"}</p>
        {grower && <button type="button" data-giant-pull-open className={`${GREEN} w-full`} disabled={busy} onClick={() => void send("open")}>{th ? "เรียกดึงอีกครั้ง" : "Call again"}</button>}
      </>}
      {ranOut && <>
        <p role="status" className={s.note} data-tone="miss">{th ? "รากยังยึดแน่น ผักยังอยู่ในดิน ไม่เสียอะไรนอกจากแรง ลองใหม่ได้เลย" : "The roots held. Nothing is lost but the stamina; try again."}</p>
        {grower ? <button type="button" data-giant-pull-open className={`${GREEN} w-full`} disabled={busy} onClick={() => void send("open")}>{th ? "เรียกดึงอีกครั้ง (ทีมเดิม)" : "Call again (same crew)"}</button>
          : <p className="text-meta text-muted">{th ? `รอ${nameOf(by)}เรียกดึงอีกครั้ง` : `Waiting for ${nameOf(by)} to call again`}</p>}
      </>}

      {isOut && <div role="status" className={s.done}>
        <p className={s.big}>{th ? "ถอนขึ้นมาแล้ว!" : "It's out!"}</p>
        {grower ? (harvest?.key === key ? (harvest.got ? <p>{th ? "ได้ " : "You got "}{harvest.got.map(([id, n]) => <span key={id} className={s.got}><TownIcon name={id as IconName} size={18} />{ITEMS[id as keyof typeof ITEMS]?.name[th ? "th" : "en"] ?? id} ×{n}</span>)}</p>
            : <><p>{harvest.why === "full" ? (th ? "กระเป๋าเต็ม ผักยักษ์วางอยู่ที่หลุม เก็บเมื่อมีที่ว่าง" : "Your bag is full: the giant lies by its pit until you make room") : (th ? "ยังเก็บไม่ได้ ลองวางของในมือแล้วกดเก็บ" : "Not picked yet: put down what you hold and pick it")}</p>
              <button type="button" className={`${GREEN} w-full`} onClick={() => { picking.current = null; setHarvest(null); setPickTry((n) => n + 1); }}>{th ? "เก็บผักยักษ์" : "Pick the giant"}</button></>)
          : <p className="text-meta text-muted">{th ? "กำลังเก็บ…" : "Picking…"}</p>)
          : <p>{helped.includes(me) ? (th ? `ช่วยดึงสำเร็จ +${PULL.points} แต้มสายผู้ช่วย` : `+${PULL.points} helpers' points`) : (th ? `ครั้งหน้าดึงให้ถูกจังหวะอย่างน้อย ${PULL.helpFrom} ครั้งเพื่อรับแต้ม` : `Pull well ${PULL.helpFrom} times next time for the points`)}</p>}
        {helped.length > 0 && <p className="text-meta text-muted">{th ? `ช่วยดึงโดย ${helped.map(nameOf).join(", ")} · เจ้าของแปลงได้ผลเพิ่ม ${helped.length}` : `Pulled with ${helped.map(nameOf).join(", ")} · ${helped.length} more for the grower`}</p>}
      </div>}
      {said && <p role="status" className={s.said}>{said}</p>}
    </section>
  </TownFoot>;
}

/** A hemp rope between two points of the board, sagging by `sag`, a pixel wide and a half in two tones with its dark edge. */
function rope(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  let last = "";
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = Math.round(x0 + (x1 - x0) * u), y = Math.round(y0 + (y1 - y0) * u + sag * 4 * u * (1 - u));
    const here = `${x},${y}`;
    if (here === last) continue;
    last = here;
    ctx.fillStyle = "#2a1a0e"; ctx.fillRect(x, y - 1, 1, 4);
    ctx.fillStyle = (Math.floor(i / 2) % 2) ? "#c9a15a" : "#9a7438"; ctx.fillRect(x, y, 1, 2);
  }
}

export type { GiantPull };
