"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import { oreOf, type MineRefusal, type PendingVein } from "@/lib/town/mining";
import { echoOf, type RockChoice } from "@/lib/town/geology";
import type { FishSfx } from "@/lib/town/sfx";
import { GEMS } from "@/lib/town/tools";
import { VEIN, begin, bestRoute, faceOf, headOf, iceOf, mayStrike, over, strike, yieldOf, type Cell, type Crack, type Family } from "@/lib/town/vein";
import { STAGE } from "./TownGame";
import TownElementFx from "./TownElementFx";
import type { ComboEffect } from "@/lib/town/combo-types";
import TownComboFx from "./TownComboFx";
import TownIcon, { type IconName } from "./TownIcon";
import styles from "./TownAdventure.module.css";

/**
 * A special vein, played (lib/town/vein): a rock face of six cells by six on the town's wooden board, over a scene
 * of its own (public/town/mine-vein-*.png, asked for when the board is first up). A thinking game with no clock.
 *
 * The one thing the board says in words is how it is played (the owner, 2026-10-08: a mini-game must not be hard to
 * understand, and one that might be has a short how-to on its own board). Everything else on it is a state: the
 * strikes left, what the crack has passed, what it has come to.
 *
 * A vein opened with no stamina left waits: its board says how many strikes there are and that what glints is to be
 * remembered, and the moment in which it shows begins only at the press of "ready".
 *
 * A face comes of a family (a seam, a cluster, a ring, a scatter), and says which: by its name, and by a pale mark
 * where the family lies. Once a go is over the face stays in sight, with the best go there was on it drawn faintly
 * beside the one that was played, and how many each passed.
 */
const SCENE = "/town/mine-vein-a4dbff6321.png";
/** How long after its last strike a go is sent, and how long a strike's own look lasts (milliseconds). */
const BEAT = { send: 650, strike: 180 };

export interface VeinCame { got: Array<[ItemId, number]>; passed: number; of: number; again: boolean }
type Sent = ({ ok: true } & VeinCame) | { ok: false; why: MineRefusal | string };

const HOW: [th: string, en: string] = [
  "แตะช่องแนวเดียวกับปลายรอยร้าว รอยร้าววิ่งไปทางนั้นได้ครั้งละ 2 ช่อง พาผ่านแร่ให้มากที่สุดก่อนหมดจำนวนครั้งที่ทุบได้ ก้อนดำกั้นทางไว้",
  "Tap a cell in line with the crack's end: it runs up to 2 cells that way. Pass as much ore as you can before your strikes run out. Dark knots stop it.",
];
/** What a face is called, by its family: of ore, and of a gem. */
const FAMILY: Record<Family, { ore: [th: string, en: string]; gem: [th: string, en: string] }> = {
  seam: { ore: ["สายแร่แนวยาว", "A seam of ore"], gem: ["สายพลอยแนวยาว", "A seam of gems"] },
  cluster: { ore: ["สายแร่เป็นกระจุก", "A cluster of ore"], gem: ["สายพลอยเป็นกระจุก", "A cluster of gems"] },
  ring: { ore: ["สายแร่วงแหวน", "A ring of ore"], gem: ["สายพลอยวงแหวน", "A ring of gems"] },
  scatter: { ore: ["สายแร่กระจาย", "Scattered ore"], gem: ["สายพลอยกระจาย", "Scattered gems"] },
};
/** A crack is no ruled line: each stretch of it is bent a little to one side, the same every time for the same two cells. */
function bent(a: readonly [number, number], b: readonly [number, number]): string {
  const k = (((a[0] * 7 + a[1] * 13 + b[0] * 17 + b[1] * 29) % 5) - 2) * 0.055, mx = (a[0] + b[0]) / 2 + 0.5, my = (a[1] + b[1]) / 2 + 0.5;
  // (to the side of the way it runs)
  const px = mx + (b[1] - a[1]) * k, py = my + (b[0] - a[0]) * k;
  return `L${px.toFixed(3)} ${py.toFixed(3)} L${(b[0] + 0.5).toFixed(3)} ${(b[1] + 0.5).toFixed(3)}`;
}

export default function TownVein({ vein, th, reduced, sfx, onBond, onEnd, onClose }: {
  onBond?: (context: "cavity" | "echo") => Promise<ComboEffect | undefined>;
  vein: PendingVein;
  th: boolean;
  /** The map's own motion switch: off, nothing on the board moves. */
  reduced: boolean;
  sfx: FishSfx | null;
  /** The go is over: its strikes, in their order. Answers with what it came to, or why it could not be kept. */
  onEnd: (strikes: Array<[number, number]>, choice?: RockChoice) => Promise<Sent>;
  onClose: () => void;
}) {
  const [bond,setBond]=useState<ComboEffect>();
  const onBondRef=useRef(onBond); onBondRef.current=onBond;
  const bondRound=`${vein.f}:${vein.rock}:${vein.turn}:${vein.seed}:${!!vein.again}`;
  const hasGeology=!!vein.geology;
  useEffect(() => { let gone=false; setBond(undefined); if(!hasGeology) return; void (async () => { const cavity=await onBondRef.current?.("cavity"); const effect=cavity ?? await onBondRef.current?.("echo"); if(!gone) setBond(effect); })(); return () => { gone=true; }; },[bondRound,hasGeology]);
  const face = useMemo(() => faceOf(vein.seed, !!vein.gem), [vein.seed, vein.gem]);
  const mods = vein.mods, ice = useMemo(() => iceOf(face, mods), [face, mods]);
  const [crack, setCrack] = useState<Crack>(() => begin(face, mods));
  const strikes = useRef<Array<[number, number]>>([]);
  /** A cell's side on the screen, for the pictures in it. */
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(52);
  const [phase, setPhase] = useState<"survey" | "ready" | "play" | "sent" | "came" | "full" | "lost">(vein.geology ? "survey" : mods.spent ? "ready" : "play");
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setCellPx(Math.max(28, el.clientWidth / face.size));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [face.size, phase]);
  /** What the board is at: waiting for its player to be ready (a vein opened with no stamina left), being played, its go sent, what it came to shown, or waiting for room in the bag. */
  const [choice, setChoice] = useState<RockChoice | undefined>();
  const [echo, setEcho] = useState<-1 | 1 | null>(null);
  const [focus, setFocus] = useState<RockChoice["focus"]>("ore");
  const [came, setCame] = useState<VeinCame | null>(null);
  /** The cell last struck and how it went, for a moment: its look on the face. */
  const [last, setLast] = useState<{ cell: [number, number]; knot: boolean; back: boolean; at: number } | null>(null);
  // (with no stamina what glints is seen only for a moment, lib/town/vein's `tired.shows`: a moment that begins when
  // the player says they are ready, and not before)
  const [seen, setSeen] = useState(!mods.spent), [readyAt, setReadyAt] = useState<number | null>(null);
  const ready = useCallback(() => { setPhase((p) => (p === "ready" ? "play" : p)); setSeen(true); setReadyAt(Date.now()); }, []);
  useEffect(() => {
    if (!mods.spent || readyAt === null) return;
    const t = setTimeout(() => setSeen(false), VEIN.tired.shows);
    return () => clearTimeout(t);
  }, [mods.spent, readyAt]);
  // the same face once more (a twin vein): the board begins again
  const round = vein.again ? 2 : 1;
  useEffect(() => { strikes.current = []; setCrack(begin(face, mods)); setPhase(vein.geology ? "survey" : mods.spent ? "ready" : "play"); setChoice(undefined); setEcho(null); setFocus("ore"); setCame(null); setLast(null); setSeen(!mods.spent); setReadyAt(null); }, [face, mods, round, vein.geology]);

  const ore = oreOf(vein.f), chip = vein.gem ? GEMS[vein.gem].chip : null;
  const soFar = yieldOf(face, crack, ore, chip, vein.more);
  const [hx, hy] = headOf(crack), done = over(face, crack);

  const send = useCallback(async () => {
    setPhase("sent");
    const did = await onEnd(strikes.current, choice);
    if (did.ok) { setCame({ got: did.got, passed: did.passed, of: did.of, again: did.again }); setPhase("came"); sfx?.work(did.got.length ? "made" : "nothing"); }
    else setPhase(did.why === "full" ? "full" : "lost");
  }, [onEnd, sfx, choice]);
  // a go that is over is sent by itself, a beat after its last strike
  useEffect(() => {
    if (phase !== "play" || !done) return;
    const t = setTimeout(() => void send(), reduced ? 200 : BEAT.send);
    return () => clearTimeout(t);
  }, [phase, done, send, reduced]);

  const hit = useCallback((cell: Cell) => {
    if (phase !== "play" || !mayStrike(face, crack, cell)) return false;
    // (never further than the crack can run: a cell beyond is the cell two along)
    const far = Math.min(VEIN.reach, Math.abs(cell[0] - hx) + Math.abs(cell[1] - hy));
    const to: [number, number] = [hx + Math.sign(cell[0] - hx) * far, hy + Math.sign(cell[1] - hy) * far];
    const did = strike(face, mods, crack, to);
    if (did.moved < 0) return false;
    strikes.current.push(to);
    setCrack(did.crack);
    setLast({ cell: to, knot: did.knot, back: did.back, at: Date.now() });
    sfx?.work(did.knot && did.moved === 0 ? "clink" : "pickHit");
    if (did.passed.length) setTimeout(() => sfx?.work("veinGlint"), 90);
    return true;
  }, [phase, face, crack, mods, hx, hy, sfx]);

  // keys: an arrow strikes two cells that way (one, with Shift held); Escape ends the go and keeps what it has won
  // (a board that waits for "ready" is neither struck nor ended by a key: Enter or the space bar on its button begins it)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (phase === "ready" || phase === "survey") return;
      const d = e.key === "ArrowLeft" ? [-1, 0] : e.key === "ArrowRight" ? [1, 0] : e.key === "ArrowUp" ? [0, -1] : e.key === "ArrowDown" ? [0, 1] : null;
      if (d) { e.preventDefault(); const far = e.shiftKey ? 1 : VEIN.reach; if (!hit([hx + d[0] * far, hy + d[1] * far])) hit([hx + d[0], hy + d[1]]); }
      else if (e.key === "Escape") { e.preventDefault(); if (phase === "play") void send(); else if (phase !== "sent") onClose(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [hit, hx, hy, phase, send, onClose]);

  // once a go is over and kept: the best go there was on this face with what this one was played with, to hold against it
  const best = useMemo(() => (phase === "came" ? bestRoute(face, mods) : null), [phase, face, mods]);

  // for scripts in `next dev`
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __townVein?: unknown }).__townVein = {
      state: () => ({ face, ice, head: [hx, hy], left: crack.left, back: crack.back, got: [...crack.got], path: crack.path, phase, seen, round, gem: vein.gem, mods, came, family: face.family, best }),
      strike: (cell: [number, number]) => hit(cell),
      enough: () => { if (phase === "play") void send(); },
      ready: () => { if (phase === "ready") ready(); },
    };
    return () => { delete (window as unknown as { __townVein?: unknown }).__townVein; };
  }, [face, ice, hx, hy, crack, phase, seen, round, vein.gem, mods, came, hit, send, ready, best]);

  const size = face.size, title = FAMILY[face.family][vein.gem ? "gem" : "ore"][th ? 0 : 1];
  // (the best go there was: straight from cell to cell, and set a little aside, so that it is seen beside the crack where the two run together)
  const bestPath = best ? best.path.map((p, i) => `${i ? "L" : "M"}${(p[0] + 0.62).toFixed(2)} ${(p[1] + 0.62).toFixed(2)}`).join(" ") : "";
  const [lx0, ly0, lx1, ly1] = face.lie;
  const path = `M${(crack.path[0][0] + 0.5).toFixed(3)} ${(crack.path[0][1] + 0.5).toFixed(3)} ${crack.path.slice(1).map((p, i) => bent(crack.path[i], p)).join(" ")}`;
  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const fresh = !!last && !reduced;

  if (phase === "survey") return <section data-vein-survey className={`${styles.panel} ${styles.wood} w-full max-w-[400px]`} aria-label={th ? "ฟังชั้นหิน" : "Listen to the rock layers"}>
    {bond && <TownComboFx cue={bond.cue} effect={bond} th={th} reduced={reduced} />}
    <h2 className="font-display text-title font-semibold">{th ? "ฟังเสียงก่อนเปิดชั้นแร่" : "Listen before opening the seam"}</h2>
    <div className={styles.scene}><TownIcon name="pick" size={42}/><p className="text-meta">{th ? "แนวแร่ส่งเสียงเป็นคลื่นยาว ส่วนโพรงให้เสียงสั้น เลือกแนวที่จะตาม แล้วเลือกว่าจะเก็บแร่หรือรักษาผลึก" : "A seam returns a long ringing wave; a cavity gives a short echo. Choose a seam, then ore or intact crystals."}</p></div>
    <fieldset>
      <legend className="text-meta">{th ? "แนวเสียงสะท้อน" : "Echo direction"}</legend>
      <div className="my-2 flex gap-2">{([-1, 1] as const).map(side => <button key={side} type="button" aria-pressed={echo === side} data-echo={side} onClick={() => { setEcho(side); sfx?.work("clink"); }} className={`pressable min-h-11 flex-1 rounded border-2 p-2 ${echo === side ? "border-[#8fd45f] bg-[#31512c]" : "border-[#2a190d] bg-[#4a2f18]"}`}>
        <svg viewBox="0 0 80 30" aria-hidden className="h-9 w-full"><path d={side === echoOf(vein.seed) ? "M1 15 L9 3 L17 27 L25 5 L33 25 L41 7 L49 23 L57 9 L65 21 L73 11 L79 15" : "M1 15 L9 5 L17 25 L25 12 L33 18 L41 15 H79"} fill="none" stroke="#f0c060" strokeWidth="2" /></svg>
        {side < 0 ? (th ? "แนวซ้าย" : "Left seam") : th ? "แนวขวา" : "Right seam"}{(vein.geology?.hint || bond?.echo !== undefined) && side === echoOf(vein.seed) ? " ✦" : ""}
      </button>)}</div>
    </fieldset>
    <fieldset className="my-2"><legend className="text-meta">{th ? "สิ่งที่จะรักษา" : "What to preserve"}</legend><div className="flex gap-2">{(["ore", "crystal"] as const).map(value => <button key={value} type="button" disabled={value === "crystal" && !vein.gem} aria-pressed={focus === value} onClick={() => setFocus(value)} className={`pressable min-h-11 flex-1 rounded border-2 p-2 text-meta disabled:opacity-40 ${focus === value ? "border-[#8fd45f] bg-[#31512c]" : "border-[#2a190d] bg-[#4a2f18]"}`}>{value === "ore" ? th ? "เก็บแร่" : "Gather ore" : th ? "รักษาผลึก" : "Preserve crystals"}</button>)}</div></fieldset>
    <p className="text-meta">{focus === "crystal" ? th ? "ใช้ผลึกที่เข้าถึงแลกกับจีโอด ไม่ได้รับเศษอัญมณีจากรอบนี้" : "Reached crystals become intact geodes; this round gives no gem fragments." : th ? "ตามแนวเสียงให้ถูกเพื่อได้ก้อนแร่จากชั้นหินเพิ่ม" : "Follow the ringing seam to collect extra mineral nodules."}</p>
    {(vein.geology?.cavities || bond?.cavities) && <p className="mt-1 text-meta text-[#bde99e]">{th ? `${bond?.cavities ? "เสียงสะท้อนเผย" : "เลนส์พบ"}จุดหินแข็ง ${face.knots.length} จุด หลีกเลี่ยงจุดเหล่านี้บนกระดาน` : `${bond?.cavities ? "The echo reveals" : "The lens finds"} ${face.knots.length} hard pockets. Avoid these knots on the board.`}</p>}
    {(vein.geology?.cavities || bond?.cavities) && <div className="mx-auto my-2 grid w-36 grid-cols-6 gap-0.5" aria-label={th ? "ตำแหน่งหินแข็งก่อนเริ่มขุด" : "Hard pockets before mining"}>{Array.from({length:36},(_,i)=>{const x=i%6,y=Math.floor(i/6),knot=face.knots.some(([kx,ky])=>kx===x&&ky===y);return <span key={i} title={`${x+1},${y+1}`} className={`grid h-5 place-items-center rounded-sm text-label ${knot ? "bg-[#a58ad5] text-[#271939]" : "bg-[#392818] text-[#e9cfa4]"}`}>{knot ? "✦" : "·"}</span>;})}</div>}
    <div className="mt-3 flex gap-2"><button type="button" onClick={onClose} className="pressable min-h-11 px-2 text-meta">{th ? "พักไว้" : "Leave for later"}</button><button type="button" disabled={echo === null} onClick={() => { if (echo !== null) { setChoice({ echo, focus }); setPhase(mods.spent ? "ready" : "play"); } }} data-survey-ready className="pressable min-h-11 flex-1 rounded border-2 border-[#2a190d] bg-[#f0c060] p-2 text-[#3a2209] disabled:opacity-40">{th ? "เริ่มตามชั้นแร่" : "Follow the seam"}</button></div>
  </section>;

  return (
    <section aria-label={title} data-town-vein data-phase={phase} data-round={round} data-left={crack.left} data-got={crack.got.length} data-of={face.points.length} data-family={face.family}
             className="relative w-full max-w-[26rem] select-none rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-3 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
      <div className="flex min-h-9 items-center gap-2">
        <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{title}</h2>
        {round === 2 && <span className="rounded-sm border-2 border-[#2a190d] bg-[#f0c060] px-1.5 font-data text-label font-semibold text-[#3a2209]" data-vein-twin>{th ? "รอบ 2" : "2nd go"}</span>}
        {/* a square for each glinting cell, filled as the crack passes them */}
        <span className="ml-1 flex gap-1" aria-label={`${crack.got.length} / ${face.points.length}`}>
          {face.points.map((_, i) => <span key={i} className={`size-3 border-2 border-[#2a190d] ${i < crack.got.length ? "bg-[#ffd15c]" : "bg-[#4a2f18]"}`} />)}
        </span>
        {/* the press that ends a go says that what it has won is kept; a board that waits for "ready" has none */}
        {phase !== "ready" && (
          <button type="button" onClick={() => { if (phase === "play") void send(); else if (phase !== "sent") onClose(); }} disabled={phase === "sent"} data-vein-enough
                  className="pressable -mr-1 ml-auto min-h-9 rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3] disabled:opacity-50">
            {phase === "play" ? (th ? "จบและเก็บแร่" : "Finish and keep ore") : (th ? "ปิด" : "Close")}
          </button>
        )}
      </div>
      <p className="-mt-0.5 mb-2 text-meta leading-relaxed text-[#f6e3bd]" data-vein-how>{th ? HOW[0] : HOW[1]}</p>

      <div className={`${STAGE} aspect-[25/27] w-full`} style={{ backgroundImage: `url(${SCENE})`, backgroundSize: "auto 118%", backgroundPosition: "center top", imageRendering: "pixelated" }}>
        {/* with no stamina: how long what glints is still to be seen */}
        {mods.spent && phase === "play" && (
          <span key={readyAt ?? 0} aria-hidden data-vein-seen={seen ? "1" : "0"} className="absolute inset-x-[5%] top-[2.5%] h-1.5 overflow-hidden border border-[#2a190d] bg-[#2a190d]/70">
            <span className="block h-full origin-left bg-[#ffd15c]" style={reduced ? { transform: seen ? "none" : "scaleX(0)" } : { animation: `vein-drain ${VEIN.tired.shows}ms linear forwards` }} />
          </span>
        )}
        <div ref={gridRef} className="absolute left-[5%] top-[8.5%] grid w-[90%] grid-cols-6" style={{ aspectRatio: "1 / 1" }} role="grid" aria-label={title}>
          {/* where the face's family lies: a pale mark under its cells (a scatter has none: it lies anywhere) */}
          {face.family !== "scatter" && (
            <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="pointer-events-none absolute inset-0 size-full" shapeRendering="crispEdges" data-vein-lie={face.lie.join(",")}>
              {face.family === "ring"
                ? <path fillRule="evenodd" fill="rgba(255,223,154,0.13)" stroke="rgba(255,223,154,0.5)" strokeWidth={0.04} strokeDasharray="0.16 0.12"
                        d={`M${lx0 + 0.08} ${ly0 + 0.08}H${lx1 + 0.92}V${ly1 + 0.92}H${lx0 + 0.08}Z M${lx0 + 1.08} ${ly0 + 1.08}H${lx1 - 0.08}V${ly1 - 0.08}H${lx0 + 1.08}Z`} />
                : <rect x={lx0 + 0.08} y={ly0 + 0.08} width={lx1 - lx0 + 0.84} height={ly1 - ly0 + 0.84} fill="rgba(255,223,154,0.13)" stroke="rgba(255,223,154,0.5)" strokeWidth={0.04} strokeDasharray="0.16 0.12" />}
            </svg>
          )}
          {Array.from({ length: size * size }, (_, i) => {
            const x = i % size, y = Math.floor(i / size);
            const p = face.points.findIndex((q) => q.x === x && q.y === y), point = p >= 0 ? face.points[p] : null, got = p >= 0 && crack.got.includes(p);
            const knot = face.knots.some(([kx, ky]) => kx === x && ky === y), icy = ice.some(([kx, ky]) => kx === x && ky === y);
            const inLine = phase === "play" && mayStrike(face, crack, [x, y]), far = Math.abs(x - hx) + Math.abs(y - hy), may = inLine && far <= VEIN.reach;
            const head = x === hx && y === hy, start = x === face.start[0] && y === face.start[1];
            const shown = !!point && phase !== "ready" && (seen || got || phase !== "play");
            const struck = last && last.cell[0] === x && last.cell[1] === y;
            const kind = knot ? (icy ? "ice" : "knot") : point ? (point.gem > 0 && chip ? "gem" : "ore") : "rock";
            const label = `${x + 1},${y + 1} ${knot ? (icy ? (th ? "ก้อนน้ำแข็ง" : "ice") : (th ? "ก้อนดำ" : "knot")) : shown ? (kind === "gem" && chip ? name(chip) : name(ore)) : (th ? "หิน" : "rock")}`;
            return (
              <button key={i} type="button" role="gridcell" aria-label={label} aria-disabled={!may} tabIndex={may ? 0 : -1} onClick={() => hit([x, y])}
                      data-vein-cell={`${x},${y}`} data-kind={kind} data-may={may ? "1" : "0"} data-got={got ? "1" : "0"} data-head={head ? "1" : "0"} data-shown={shown ? "1" : "0"}
                      className={`relative grid aspect-square place-items-center border border-[#1c110a]/55 outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#ffeccb] ${may ? "cursor-pointer bg-[#ffe7b0]/[0.16]" : "cursor-default"} ${may && far === VEIN.reach ? "shadow-[inset_0_0_0_2px_rgba(255,231,176,0.55)]" : ""}`}>
                {/* a cell that can be struck says which way the crack would run */}
                {may && !knot && !shown && (
                  <span aria-hidden className="size-2 border-r-2 border-t-2 border-[#ffeccb]/80" style={{ transform: `rotate(${x > hx ? 45 : x < hx ? 225 : y > hy ? 135 : -45}deg)` }} />
                )}
                {knot && <TownIcon name={"veinKnot" as IconName} size={Math.round(cellPx * 0.72)} className={icy ? "opacity-80 [filter:hue-rotate(160deg)_saturate(2.2)_brightness(1.9)]" : ""} />}
                {icy && <span aria-hidden className="absolute inset-[14%] rounded-sm border-2 border-[#bfeaff]/80 bg-[#8fdcff]/25" />}
                {shown && point && (
                  <span className={`relative grid place-items-center ${got ? "opacity-35 grayscale" : reduced ? "" : "animate-[vein-glint_1.8s_ease-in-out_infinite]"}`} style={got || reduced ? undefined : { animationDelay: `${(p * 310) % 1500}ms` }}>
                    <TownIcon name={(kind === "gem" && chip ? iconOf(chip) : "veinOre") as IconName} size={Math.round(cellPx * 0.7)} />
                  </span>
                )}
                {got && <span aria-hidden className="absolute bottom-0.5 right-1 font-data text-label font-semibold text-[#ffe9a8] [text-shadow:0_1px_0_#1c110a,0_-1px_0_#1c110a,1px_0_0_#1c110a,-1px_0_0_#1c110a]">+{point && point.gem > 0 && chip ? point.gem : VEIN.ore}</span>}
                {start && <span aria-hidden className="absolute inset-[30%] rotate-45 border-2 border-[#1c110a] bg-[#3a2513]" />}
                {struck && fresh && <span key={last.at} aria-hidden className={`pointer-events-none absolute inset-0 animate-[vein-hit_260ms_ease-out_forwards] border-2 ${last.knot ? "border-[#ff8a6b]" : "border-[#fff6d8]"}`} />}
              </button>
            );
          })}
          {/* the crack: drawn once over the whole face, a dark groove with a pale line of dust in it */}
          <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" shapeRendering="crispEdges" data-vein-crack={crack.path.length}>
            {/* the best go there was, faintly, under the one that was played: a broken pale line, and a ring on what it passes */}
            {best && bestPath && (
              <g data-vein-best={best.passed} opacity={0.75}>
                <path d={bestPath} fill="none" stroke="#0b1a24" strokeWidth={0.13} strokeLinejoin="miter" />
                <path d={bestPath} fill="none" stroke="#a9e6ff" strokeWidth={0.07} strokeLinejoin="miter" strokeDasharray="0.2 0.14" />
                {best.got.map((p) => <rect key={p} x={face.points[p].x + 0.1} y={face.points[p].y + 0.1} width={0.8} height={0.8} fill="none" stroke="#a9e6ff" strokeWidth={0.05} strokeDasharray="0.12 0.1" />)}
              </g>
            )}
            <path d={path} fill="none" stroke="#150b06" strokeWidth={0.2} strokeLinejoin="miter" strokeLinecap="square" />
            <path d={path} fill="none" stroke="#ffdf9a" strokeWidth={0.07} strokeLinejoin="miter" strokeLinecap="square" />
            <rect x={hx + 0.5 - 0.13} y={hy + 0.5 - 0.13} width={0.26} height={0.26} fill="#fff3c9" stroke="#150b06" strokeWidth={0.06} transform={`rotate(45 ${hx + 0.5} ${hy + 0.5})`} />
            {!reduced && phase === "play" && <rect x={hx + 0.5 - 0.3} y={hy + 0.5 - 0.3} width={0.6} height={0.6} fill="none" stroke="#fff3c9" strokeWidth={0.05} className="origin-center animate-[vein-head_1.3s_ease-out_infinite]" style={{ transformBox: "fill-box" }} />}
          </svg>
        </div>

        {/* opened with no stamina left: the board waits, and says what there is to this go, until its player is ready */}
        {phase === "ready" && (
          <div className={`absolute inset-x-[7%] top-[30%] rounded-md border-[3px] border-[#2a190d] bg-[#f6e3bd] px-3 py-3 text-center text-[#3a2209] shadow-[0_6px_0_rgba(0,0,0,0.35)] ${reduced ? "" : "pop-in"}`} data-state="open" data-vein-wait>
            <p className="flex items-center justify-center gap-1" aria-hidden>
              {Array.from({ length: mods.strikes }, (_, i) => <TownIcon key={i} name={"pick" as IconName} size={22} />)}
            </p>
            <p className="mt-1.5 text-ui font-semibold leading-relaxed">
              {th ? `หมดแรงแล้ว: ทุบได้ ${mods.strikes} ครั้ง` : `No stamina left: ${mods.strikes} strikes`}
            </p>
            <p className="text-ui leading-relaxed">
              {th ? `จุดแร่จะโชว์ ${VEIN.tired.shows / 1000} วินาทีแล้วหายไป จำตำแหน่งไว้` : `The ore shows for ${VEIN.tired.shows / 1000} seconds, then hides. Remember where it is.`}
            </p>
            <button type="button" onClick={ready} data-vein-ready autoFocus
                    className="pressable mt-2.5 min-h-11 w-full rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] text-read font-semibold text-[#3a2209] shadow-[inset_0_-4px_0_#c98f2f,inset_0_2px_0_#ffe19a] active:translate-y-px">
              {th ? "พร้อมแล้ว" : "Ready"}
            </button>
          </div>
        )}

        {/* waiting for room in the bag, or gone: said over the face */}
        {(phase === "full" || phase === "lost") && (
          <div className={`absolute inset-x-[7%] bottom-[7%] rounded-md border-[3px] border-[#2a190d] bg-[#f6e3bd] px-3 py-2.5 text-[#3a2209] shadow-[0_6px_0_rgba(0,0,0,0.35)] ${reduced ? "" : "pop-in"}`} data-state="open" data-vein-came={phase} aria-live="polite">
            {phase === "full" && (
              <>
                <p className="text-ui font-semibold">{th ? "กระเป๋าเต็ม ของยังรออยู่ในสายแร่" : "Your bag is full: it waits in the vein"}</p>
                <button type="button" onClick={() => void send()} data-vein-retry
                        className="pressable mt-2.5 min-h-11 w-full rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] text-read font-semibold text-[#3a2209] shadow-[inset_0_-4px_0_#c98f2f,inset_0_2px_0_#ffe19a] active:translate-y-px">{th ? "เก็บอีกครั้ง" : "Try again"}</button>
              </>
            )}
            {phase === "lost" && <p className="text-ui font-semibold">{th ? "สายแร่นี้ไม่อยู่แล้ว" : "This vein is gone"}</p>}
          </div>
        )}
      </div>

      {/* what it came to: under the face, which stays in sight with the go that was played and the best go there was */}
      {phase === "came" && came && (
        <div className={`mt-2 rounded-md border-[3px] border-[#2a190d] bg-[#f6e3bd] px-3 py-2.5 text-[#3a2209] shadow-[0_6px_0_rgba(0,0,0,0.35)] ${reduced ? "" : "pop-in"}`} data-state="open" data-vein-came={phase} data-vein-passed={came.passed} data-vein-could={best?.passed ?? ""} aria-live="polite">
          <p className="text-ui font-semibold">{came.passed > 0 ? (th ? `รอยร้าวผ่านแร่ ${came.passed} จาก ${came.of} จุด` : `The crack passed ${came.passed} of ${came.of}`) : (th ? "รอยร้าวไม่ผ่านแร่เลย" : "The crack passed no ore")}</p>
          {best && (
            <p className="mt-0.5 flex items-center gap-2 text-ui" data-vein-against={best.passed > came.passed ? "more" : "best"}>
              <svg aria-hidden viewBox="0 0 26 8" className="h-2 w-[1.625rem] shrink-0"><path d="M1 4H25" fill="none" stroke="#0b1a24" strokeWidth={4} /><path d="M1 4H25" fill="none" stroke="#a9e6ff" strokeWidth={2} strokeDasharray="5 3" /></svg>
              <span>{best.passed > came.passed
                ? (th ? `เส้นทางที่ดีที่สุดผ่านได้ ${best.passed} จุด` : `The best route passes ${best.passed}`)
                : (th ? "เส้นทางนี้ดีที่สุดเท่าที่ทำได้แล้ว" : "No route passes more than yours")}</span>
            </p>
          )}
          {came.got.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {came.got.map(([id, n]) => (
                <li key={id} className="flex items-center gap-1.5 text-ui" data-vein-got={id} data-n={n}><TownIcon name={iconOf(id) as IconName} size={24} /><span>{name(id)}</span><span className="font-data font-semibold tabular-nums">×{n}</span></li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onClose} data-vein-next autoFocus
                  className="pressable mt-2.5 min-h-11 w-full rounded-md border-[3px] border-[#2a190d] bg-[#f0c060] text-read font-semibold text-[#3a2209] shadow-[inset_0_-4px_0_#c98f2f,inset_0_2px_0_#ffe19a] active:translate-y-px">
            {came.again ? (th ? "สายแร่แฝด: ทุบอีกรอบ" : "Twin vein: once more") : (th ? "เก็บใส่กระเป๋าแล้ว" : "In the bag")}
          </button>
        </div>
      )}

      {/* the strikes left, what a knot still gives back, and what the crack has passed so far */}
      <div className="mt-2 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 text-[#ffeccb]">
        <span className="flex items-center gap-0.5" aria-label={th ? `ทุบได้อีก ${crack.left} ครั้ง` : `${crack.left} strikes left`} data-vein-strikes={crack.left}>
          {Array.from({ length: mods.strikes }, (_, i) => <TownIcon key={i} name={"pick" as IconName} size={20} className={i < crack.left ? "" : "opacity-25 grayscale"} />)}
        </span>
        {mods.back > 0 && (
          <span className="flex items-center gap-1 font-data text-meta tabular-nums" data-vein-back={crack.back} aria-label={th ? `โดนก้อนดำแล้วได้คืนอีก ${crack.back} ครั้ง` : `${crack.back} given back`}>
            <TownIcon name={iconOf(GEMS.water.gem) as IconName} size={18} />×{crack.back}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2.5 font-data text-meta tabular-nums" data-vein-sofar>
          {soFar.map(([id, n]) => <span key={id} className="flex items-center gap-1"><TownIcon name={iconOf(id) as IconName} size={20} />×{n}</span>)}
        </span>
      </div>
      <style>{`
        @keyframes vein-glint { 0%, 100% { filter: brightness(1); transform: scale(1); } 50% { filter: brightness(1.45); transform: scale(1.07); } }
        @keyframes vein-hit { from { opacity: 1; transform: scale(0.82); } to { opacity: 0; transform: scale(1.12); } }
        @keyframes vein-head { from { opacity: 0.9; transform: scale(0.5); } to { opacity: 0; transform: scale(1.35); } }
        @keyframes vein-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>
      <TownElementFx key={round} pulse={last?.at ?? 0} active={phase === "play"} target="[role=grid]"
                     x={last ? (last.cell[0] + 0.5) / size : 0.5} y={last ? (last.cell[1] + 0.5) / size : 0.5} />
    </section>
  );
}
