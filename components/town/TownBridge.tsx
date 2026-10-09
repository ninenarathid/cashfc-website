"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BANNER_AT, BRIDGE, COURSE_AT, MARKS, SIGN_AT, bridgeSpans, bridgeWhole, carrying, course, holdFor, inSpan, nearTile, stands, takers, toFoot, type FindTold, type Hand, type Lack, type Named } from "@/lib/town/bridge";
import type { Keeper } from "@/lib/town/keeper";
import type { SceneryKit, Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { handOf } from "@/lib/town/trade";
import { walkable, type Vec } from "@/lib/town/world";
import { loadWorksArt } from "@/lib/town/works-art";
import type { FarmDraw } from "./TownFarm";
import TownFoot from "./TownFoot";

export type { Hand };
/** What a tap on the map came to here: nothing of the bridge's (null), or the pile's or the sign's: done where I stand, or to be walked to. With `peek` nothing is done. */
export type BridgeTap = (x: number, y: number, peek?: boolean) => { walk: Vec | null } | null;

/** How often a bridge that is not open yet is asked after, in milliseconds (the game itself is asked after every five minutes while it is shut). */
const CLOSED_AGAIN = 5 * 60_000;
/** How long what a stone laid earned me is said, a find with it, and a span's feast (the whole bridge's a little longer), in milliseconds: slowly, each. */
const EARNED_MS = 5200, FOUND_MS = 7000, FEAST_MS = 9000, WHOLE_MS = 14_000;
/** How long the find's flourish is drawn at the foot, in milliseconds; and how near the foot one stands to be shown a find one had no hand in, in tiles. */
const GLINT_MS = 4600, SEEN = 12;
/** A span laid is feasted by a page that saw it laid, not by one that comes back to find the bridge much further on: so many stones at the most since it last looked. */
const FRESH = 20;

/** Where the sign stands: beside the foot, away from the water (one tile to the right of it on the screen), wherever the foot is (lib/town/bridge says where it may not). */
const SIGN: Vec = SIGN_AT;
/** How near the sign one stands to read it, in tiles. */
const READ = 3;
/** How large the pile, the sign, the banner, the marks on the road and the building at the foot are drawn, as shares of their pictures' own size. */
const PILE_K = 0.95, SIGN_K = 0.9, BANNER_K = 0.8, STAND_K = 0.72, SITE_K = 0.85;
/** The bar on the sign's board, in the sign's own pixels from its picture's corner: where it begins, how long and how high it is. */
const BAR = { x: 13, y: 43, w: 27, h: 3 };
/**
 * The course of stones at the foot, as its ten steps are laid: where each stone lies from the course's ground point,
 * in the picture's own pixels (four, then three on them, then two, then one), and which of the three stones' pictures
 * it is. Drawn from the same three small pictures, never made by the frame.
 */
const STONE_W = 19, STONE_H = 7;
const COURSE: Array<[dx: number, dy: number, art: string]> = [
  [-1.5, 0, "courseA"], [-0.5, 0, "courseC"], [0.5, 0, "courseA"], [1.5, 0, "courseB"],
  [-1, 1, "courseA"], [0, 1, "courseB"], [1, 1, "courseC"],
  [-0.5, 2, "courseC"], [0.5, 2, "courseA"],
  [0, 3, "courseA"],
];
/** What is put up beside the course as its span comes on, each from its share of the span (lib/town/bridge's `MORE`): which picture, where from the course's ground point in the picture's pixels, and whether it stands behind the course. */
const UP: Array<{ art: string; dx: number; dy: number; behind: boolean }> = [
  { art: "siteScaffold", dx: -20, dy: -4, behind: true }, { art: "siteHoist", dx: 40, dy: 3, behind: false }, { art: "siteArch", dx: -46, dy: 8, behind: false },
];

/** Why not, in the bridge's own words: for whoever lifts and lays, and for a stone handed on. */
const WHY_MINE: Record<string, [th: string, en: string]> = {
  closed: ["สะพานยังไม่เปิดให้สร้าง", "The bridge is not open yet"], whole: ["สะพานเสร็จแล้ว ไม่ต้องใช้หินเพิ่ม", "The bridge is whole: it needs no more stone"],
  far: ["ต้องยืนใกล้กว่านี้", "Stand nearer"], hand: ["เก็บของที่ถืออยู่ก่อน ถึงจะยกหินได้", "Put away what you hold first"],
  held: ["ถือหินอยู่แล้ว", "You hold a stone already"], none: ["ไม่ได้ถือหินอยู่", "You hold no stone"], away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
};
const WHY_PASS: Record<string, [th: string, en: string]> = {
  ...WHY_MINE, hand: ["อีกฝ่ายถือของอยู่ ยังรับหินไม่ได้ หินยังอยู่กับเรา", "They have a thing in their hand: the stone is still yours"], held: ["อีกฝ่ายถือหินอยู่แล้ว หินยังอยู่กับเรา", "They hold a stone already: yours is still yours"],
  none: ["ไม่มีใครรับหิน หินยังอยู่กับเรา", "Nobody is there to take it: the stone is still yours"],
  // (the button of tired hands let go of before it was full: nothing is done, and nothing is lost)
  early: ["กดค้างไว้จนแถบเต็ม หินถึงจะไปถึงมือเพื่อน", "Keep it held until the bar is full"],
  // (they walked on, took a thing up or went out of reach between the offer and the press: nothing is done)
  moved: ["เพื่อนขยับไปแล้วหรืออยู่ไกลเกินไป หินยังอยู่กับเรา", "They have moved or are too far now: the stone is still yours"],
};
/** What somebody close by lacks to be handed a stone, said of them by name. */
const LACKS: Record<Lack, [(name: string) => string, (name: string) => string]> = {
  walking: [(n) => `${n} ต้องยืนนิ่งก่อน ถึงจะรับหินได้`, (n) => `${n} has to stand still to take the stone`],
  hand: [(n) => `${n} ต้องมือเปล่าก่อน ถึงจะรับหินได้`, (n) => `${n} has to have empty hands to take the stone`],
  held: [(n) => `${n} ถือหินอยู่แล้ว`, (n) => `${n} holds a stone already`],
};
/** How it is done, in three steps: what the strip over the buttons and the sign both say. */
const STEPS: Array<[th: string, en: string]> = [
  ["ยกหินที่กองหินข้างร้านลุง", "Lift a stone at the pile by the shop"],
  ["ส่งต่อให้เพื่อนที่ยืนมือเปล่า หรือเดินไปเอง", "Hand it to a friend with empty hands, or walk it"],
  ["วางหินที่เชิงสะพาน", "Lay it at the bridge's foot"],
];
/** Said beforehand, in one line each: what a stone laid counts for, and where to stand and where the foot is. */
const COUNTS: [th: string, en: string] = ["หินถึงสะพานเมื่อไหร่ ทุกมือที่ช่วยส่งได้ +1 ก้อนเท่ากัน", "Once a stone is laid, every hand it went through is counted one, all alike"];
const WHERE: [th: string, en: string] = ["วงหินบนทางคือจุดยืนส่งต่อ ธงแดงคือเชิงสะพาน", "The rings of pebbles on the road are where a row stands; the red banner is the bridge's foot"];
/** What a stone may have in it: its picture, and what it is called. One it knows no name for (a kind added since) is a strange thing in the stone. */
const FINDS: Record<string, { art: string; th: string; en: string }> = {
  shell: { art: "findShell", th: "เปลือกหอยในหิน", en: "a shell in the stone" }, coin: { art: "findCoin", th: "เหรียญเก่าของหมู่บ้าน", en: "an old coin of the village" },
  rune: { art: "findRune", th: "ลายสลักโบราณ", en: "a carved sign" }, pearl: { art: "findPearl", th: "ไข่มุกแม่น้ำ", en: "a river pearl" },
  star: { art: "findStar", th: "หินรูปดาว", en: "a star-shaped stone" }, leaf: { art: "findLeaf", th: "รอยพิมพ์ใบไม้", en: "a leaf's print" },
};
const findOf = (kind: string) => FINDS[kind] ?? { art: "glint", th: "ของแปลกในหิน", en: "a strange thing in the stone" };

/** What moves in a span's feast: slowly, and not at all for whoever asked for less motion. */
const FEAST_CSS = `
  @keyframes bridge-feast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  @keyframes bridge-sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
  @keyframes bridge-fall { 0% { transform: translateY(-14px); opacity: 0; } 18% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(84px); opacity: 0; } }
  @keyframes bridge-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .bridge-feast { animation: bridge-feast-in 900ms ease-out both; }
  .bridge-feast [data-sway] { transform-origin: 50% 0; animation: bridge-sway 4.4s ease-in-out infinite; }
  .bridge-feast [data-fall] { animation: bridge-fall 7s linear infinite both; }
  .bridge-rise { animation: bridge-rise 600ms ease-out both; }
  @media (prefers-reduced-motion: reduce) { .bridge-feast, .bridge-feast [data-sway], .bridge-feast [data-fall], .bridge-rise { animation: none; } }
`;

/** One of the works' own pictures, cut out of the scenery's picture: its pixels kept square. `wide`: as wide as the box, and as high as it comes to. `shadow`: only its shape, dark. */
function Art({ sprite, box, wide = false, shadow = false }: { sprite: Sprite | null; box: number; wide?: boolean; shadow?: boolean }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: wide ? box / 3 : box }} />;
  const [x, y, w, h] = sprite.at, k = box / (wide ? w : Math.max(w, h));
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: wide ? h * k : box }}>
      <span style={{ width: w * k, height: h * k, backgroundImage: `url(${sprite.src})`, backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`, backgroundPosition: `${-x * k}px ${-y * k}px`, imageRendering: "pixelated", ...(shadow ? { filter: "brightness(0)", opacity: 0.4 } : {}) }} />
    </span>
  );
}

/** The three steps, the one to do now lit and those done ticked (`at`: 0 to 2). */
function Steps({ th, at, wide = false }: { th: boolean; at: number; wide?: boolean }) {
  return (
    <ol className={`grid gap-1.5 ${wide ? "grid-cols-1" : "grid-cols-3"}`} data-bridge-steps={at}>
      {STEPS.map((s, i) => (
        <li key={i} data-now={i === at} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-label leading-snug ${i === at ? "border-gold/70 bg-gold/15 font-semibold text-ink" : i < at ? "border-line bg-bg/60 text-jade" : "border-line bg-bg/60 text-muted"}`}>
          <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full font-data tabular-nums ${i === at ? "bg-gold text-bg" : "bg-surface text-muted"}`}>{i < at ? "✓" : i + 1}</span>
          <span className="min-w-0">{th ? s[0] : s[1]}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A button that is held, for tired hands (lib/town/bridge's `holdFor`): it fills while it is held, and what it is for
 * is done when it is full. Let go of early, nothing is done and nothing is lost (`onEarly` says so). **Nothing to be
 * quick at, and it cannot fail**: by the mouse, a finger, or the space bar and Enter held down.
 */
function HoldButton({ secs, onDone, onEarly, disabled, who, className, children }: { secs: number; onDone: () => void; onEarly: () => void; disabled: boolean; who: string; className: string; children: ReactNode }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), done = useRef(onDone);
  done.current = onDone;
  const stop = useCallback((early: boolean) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; if (early) onEarly(); }
    setHolding(false);
  }, [onEarly]);
  const start = useCallback(() => {
    if (disabled || timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => { timer.current = null; setHolding(false); done.current(); }, secs * 1000);
  }, [disabled, secs]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <button type="button" disabled={disabled} data-bridge-chip={who} data-hold={secs} data-holding={holding}
            onPointerDown={(e) => { if (e.pointerType === "mouse" && e.button !== 0) return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no capture: held all the same */ } start(); }}
            onPointerUp={() => stop(true)} onPointerCancel={() => stop(false)} onBlur={() => stop(false)} onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) start(); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stop(true); } }}
            className={`${className} relative select-none overflow-hidden`} style={{ touchAction: "none", WebkitTouchCallout: "none" }}>
      <span aria-hidden className="absolute inset-0 origin-left bg-gold/40" data-bridge-fill style={{ transform: `scaleX(${holding ? 1 : 0})`, transition: holding ? `transform ${secs}s linear` : "transform 200ms ease-out" }} />
      <span className="relative flex min-w-0 items-center gap-2">{children}</span>
    </button>
  );
}

/**
 * The bridge built by hand (lib/town/bridge; the owner, 2026-10-08: "สะพานจากมือชาวบ้าน", and of every such piece:
 * "ขอ UI ดีๆเท่าที่จะเป็นไปได้ mini game เข้าใจไม่ยาก ถ้าเข้าใจยากเขียนวิธีเล่นไว้คร่าวๆด้วย"; and that evening, of what it
 * would take for made-up players to score it ninety: "ขอให้ทำทุกอันเป็นแบบดันสุดเลย … เอาตามที่ codex ว่ามาได้เลย").
 *
 * A pile of stone stands by the uncle's shop, under a cloth until the bridge is opened. Standing by it with empty
 * hands, a button lifts a stone (a tap on the pile walks up to it and lifts one). The stone is seen in my hands by
 * everybody, and I walk at half the pace with it. Standing still with one, whoever stands still with empty hands
 * within ten tiles is offered by name, three at the most, those nearer the bridge's foot first: a press, and it is in
 * their hands. With nobody to offer, whoever stands close by is named with what they lack. At the foot a button lays
 * it. It can be let go of anywhere (two presses: it is gone for good).
 *
 * **Nobody is ever unsure what to do, nothing is lost by a slip, nothing is gated by quick hands, and everybody who
 * took part is counted and named**:
 * - **No board at any stamina.** With no stamina on either side the same button is held for a little over a second
 *   and fills (`HoldButton`); let go of early, the stone is where it was. Nothing comes up on the other's page.
 * - **Every hand sees what it earned**: when a stone I had a hand in is laid, wherever I stand, "+1 stone · 73/100 of
 *   this span" and the helpers' point; and the offer and the sign say beforehand that it will be so.
 * - **Places to stand**: while the bridge is being built the road has a ring of pebbles where each of a row would
 *   stand (lib/town/bridge's `stands`), and a banner at the foot. They are only drawn.
 * - **Progress seen at once**: at the foot a course of stones grows through the span in hand, a step for every tenth
 *   stone, with a scaffold from a quarter of the span, a hoist and its rope from a half and an arch's form from three
 *   quarters. (The bridge's own six states are the map's: `bridgeSpans`, `bridgeWhole`.)
 * - **A feast at every hundredth stone**: every page of the town says so for a few seconds, slowly, with the names of
 *   that span's hands; and the sign keeps "span n, laid by …" for each.
 * - **Marked stones**: about one in twenty-five has something in it, which nobody is told while it is carried. Laid,
 *   it is set in the bridge: a glint at the foot for whoever is near, its hands told wherever they are, and the sign
 *   shows every find with its hands' names, and the kinds I have had a hand in (the rest as shadows).
 *
 * **How it is done is said in three steps, the one to do now lit**: over the buttons at the pile and while a stone is
 * held, and on the sign. The sign stands at the foot; a tap on it or on the banner (walked up to first) opens its
 * panel: the village's bar, so many of six hundred and which span of six; the three steps; my own count, shown to me
 * alone; each span's hands; the finds; and everybody who has helped, in the order they first came, with no numbers
 * and no ranking.
 *
 * The map draws all of it through here (the works' own picture: lib/town/works-art), from prepared pictures and
 * nothing made by the frame; the stone in somebody's hands is the map's own to draw, with everybody else. What sits
 * at the foot of the screen is put into the map's one grid (components/town/TownFoot).
 *
 * What is kept is the keeper's: for a member the database's (v160), in `next dev`'s test room the browser's trial.
 * A keeper that knows of no works (the database before v160) shows nothing; a bridge that is not open shows only its
 * pile under the cloth.
 */
export default function TownBridge({ keeper, me, th, here, people, sfx, phone, tabbar, register, registerTap, carry }: {
  keeper: Keeper;
  me: string;
  th: boolean;
  /** The tile I stand still on, while nothing else is open over the map; null otherwise. */
  here: [number, number] | null;
  /** Everybody on the map now, as the map has them. */
  people: () => Hand[];
  sfx: FishSfx | null;
  phone: boolean;
  tabbar: boolean;
  /** Hand the map the way to draw the pile, the sign and the building, and the way to ask whether a tap was on one of them (and take each back with null). */
  register: (draw: FarmDraw | null) => void;
  registerTap: (tap: BridgeTap | null) => void;
  /** Tell the room what I carry in my hands (a stone), or that they are free of it. */
  carry: (thing: string | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const works = keeper.works(), bridge = works?.works[BRIDGE.work] ?? null, open = !!bridge?.open;
  const need = bridge?.needs[BRIDGE.thing] ?? null, spans = bridgeSpans(works), whole = bridgeWhole(works), held = carrying(works);
  const have = need?.have ?? 0, mine = bridge?.mine[BRIDGE.thing] ?? 0, finds = bridge?.finds ?? [];
  const purse = keeper.purse(), hand = handOf(purse), tired = isSpent(purse, keeper.now());

  // The works' own pictures: fetched once there are works to show, and the scenery they were added to kept for the map.
  const kit = useRef<SceneryKit | null>(null);
  const [drawn, setDrawn] = useState(false);
  const known = !!works;
  useEffect(() => {
    if (!known) return;
    let gone = false;
    void loadWorksArt().then((k) => { if (!gone) { kit.current = k; setDrawn(true); } }).catch(() => { /* no picture: nothing is drawn, and the buttons work all the same */ });
    return () => { gone = true; };
  }, [known]);
  const art = (name: string) => (drawn ? kit.current?.sprite(name) ?? null : null);

  // The room is told what I carry, so that every page draws it and walks me at its pace.
  useEffect(() => { carry(held); }, [held, carry]);
  // While the bridge is being built it is read again now and then (a stone handed to me, and every stone laid, are
  // told through the room at once; this is for a word the room lost).
  useEffect(() => (open && !whole ? keeper.look("works") : undefined), [keeper, open, whole]);
  // While it is not open yet it is asked after seldom: so that the pile is uncovered on a page that was here already
  // when its owner opened it, with nothing loaded again (as the game itself opens: lib/town/keeper).
  useEffect(() => {
    if (!known || open) return;
    const again = setInterval(() => void keeper.worksLook(), CLOSED_AGAIN);
    return () => clearInterval(again);
  }, [keeper, known, open]);

  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3200); return () => clearTimeout(t); }, [note]);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4600); return () => clearTimeout(t); }, [toast]);
  const [busy, setBusy] = useState(false);
  const say = useCallback((words: Record<string, [string, string]>, why: string) => { const w = words[why] ?? words.far; setNote(th ? w[0] : w[1]); }, [th]);
  const hereRef = useRef(here), worksRef = useRef(works), busyRef = useRef(false);
  hereRef.current = here;
  worksRef.current = works;

  // who stands where is the map's, and changes without anything of the keeper's changing: looked at twice a second while I hold a stone
  const looking = !!held && !!here;
  useEffect(() => {
    if (!looking) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [looking]);
  const atPile = !!here && nearTile(here, BRIDGE.pile), atFoot = !!here && nearTile(here, BRIDGE.foot);
  const found = looking && here ? takers(me, { x: here[0] + 0.5, y: here[1] + 0.5 }, people()) : null;
  const offered = found?.offered ?? [], lacks = found?.lacks ?? null;
  const nameOf = useCallback((id: string, told = "") => told || people().find((p) => p.id === id)?.name || "", [people]);
  const called = (who: Named) => nameOf(who.id, who.name) || (th ? "ชาวบ้าน" : "A villager");

  /** A stone of my own lifting is no news to me: only one that comes into my hands by somebody else's. */
  const lifting = useRef(false);
  const lift = useCallback(async () => {
    const at = hereRef.current;
    if (!at || busyRef.current) return;
    busyRef.current = true; setBusy(true); lifting.current = true;
    const did = await keeper.stoneLift(at);
    busyRef.current = false; setBusy(false);
    if (!did.ok) { lifting.current = false; say(WHY_MINE, did.why); return; }
    sfx?.wake();
    sfx?.work("pick", 0.8);
  }, [keeper, sfx, say]);
  const lay = useCallback(async () => {
    const at = hereRef.current;
    if (!at || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    const did = await keeper.stoneLay(at);
    busyRef.current = false; setBusy(false);
    if (!did.ok) {
      // (it came too late: the bridge has all its stones. It is set down where I stand, and that is said.)
      if (did.why === "whole") { await keeper.stoneDrop(); setNote(th ? "สะพานเสร็จแล้ว วางหินไว้ตรงนี้" : "The bridge is whole: the stone is set down here"); return; }
      say(WHY_MINE, did.why);
      return;
    }
    // (what it earned, a span's feast and a find are said by what the keeper tells of the works then: below)
    sfx?.wake();
    sfx?.work("knock", 0.9);
  }, [keeper, sfx, say, th]);
  /** Hand the stone on to somebody: it is in their hands, and they are told through the room. Refused (they took a thing up meanwhile), the stone is where it was, and why is said. */
  const passTo = useCallback(async (to: { id: string; name: string }) => {
    if (busyRef.current) return;
    // (who may be handed a stone is looked at twice a second, and a held button takes longer than that: so whether
    // they still stand still, with empty hands and within reach, is looked at again at the moment it is handed on.
    // Nobody who keeps the game knows where anybody stands, so this is the only place it can be held to.)
    const at = hereRef.current;
    if (!at || !takers(me, { x: at[0] + 0.5, y: at[1] + 0.5 }, people()).offered.some((p) => p.id === to.id)) { say(WHY_PASS, "moved"); return; }
    busyRef.current = true; setBusy(true);
    const did = await keeper.stonePass(to.id);
    busyRef.current = false; setBusy(false);
    if (!did.ok) { say(WHY_PASS, did.why); return; }
    sfx?.wake();
    sfx?.work("pick", 0.6);
    setNote(th ? `ส่งหินให้ ${to.name || "เพื่อน"} แล้ว` : `Handed to ${to.name || "them"}`);
  }, [keeper, sfx, say, th, me, people]);
  const early = useCallback(() => say(WHY_PASS, "early"), [say]);
  /** Letting go takes two presses: a stone let go of is gone for good. */
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 3500); return () => clearTimeout(t); }, [sure]);
  useEffect(() => { if (!held) setSure(false); }, [held]);
  const letGo = useCallback(async () => {
    if (busyRef.current) return;
    if (!sure) { setSure(true); return; }
    busyRef.current = true; setBusy(true);
    const did = await keeper.stoneDrop();
    busyRef.current = false; setBusy(false);
    setSure(false);
    if (!did.ok) { say(WHY_MINE, did.why); return; }
    setNote(th ? "ปล่อยหินแล้ว" : "The stone is let go");
  }, [keeper, sure, say, th]);

  // ── what the keeper's telling of the works has new in it, said once each ──
  // A stone that came into my hands by somebody's hand; a stone I had a hand in, laid (wherever I stand); something
  // found in a stone (to its hands wherever they are, and to whoever is near the foot); a span laid, or the bridge
  // whole (to every page of the town).
  const [earned, setEarned] = useState<{ n: number; at: number; of: number } | null>(null);
  useEffect(() => { if (!earned) return; const t = setTimeout(() => setEarned(null), EARNED_MS); return () => clearTimeout(t); }, [earned]);
  const [dug, setDug] = useState<{ find: FindTold; mine: boolean } | null>(null);
  useEffect(() => { if (!dug) return; const t = setTimeout(() => setDug(null), FOUND_MS); return () => clearTimeout(t); }, [dug]);
  const [feast, setFeast] = useState<{ span: number; whole: boolean; names: Named[]; all: number } | null>(null);
  useEffect(() => { if (!feast) return; const t = setTimeout(() => setFeast(null), feast.whole ? WHOLE_MS : FEAST_MS); return () => clearTimeout(t); }, [feast]);
  /** What the map draws for a moment at the foot: the thing found, rising with a glint; and lanterns while a span is feasted. */
  const glint = useRef<{ kind: string; since: number | null } | null>(null), feasting = useRef(false);
  feasting.current = !!feast;
  const was = useRef<{ held: string | null; spans: number; mine: number; finds: number; have: number } | null>(null);
  useEffect(() => {
    const before = was.current;
    was.current = open ? { held, spans, mine, finds: finds.length, have } : null;
    if (!before || !open) return;
    if (held && !before.held) {
      if (lifting.current) lifting.current = false;
      else { setToast(th ? "มีคนส่งหินมาให้ ถือไว้แล้ว" : "Somebody handed you a stone"); sfx?.wake(); sfx?.work("pick", 0.7); }
    }
    const fresh = have > before.have && have - before.have <= FRESH;
    if (mine > before.mine && fresh) {
      const into = inSpan(have, need?.need ?? null);
      // (a helpers' point; past the day's bound of theirs a point counts a quarter: lib/town/lines)
      setEarned({ n: mine - before.mine, at: into?.n ?? have, of: into?.of ?? 0 });
    }
    if (finds.length > before.finds && fresh) {
      const find = finds[finds.length - 1], had = find.hands.some((h) => h.id === me || h.id === keeper.id);
      const self = people().find((p) => p.id === me), near = !!self && toFoot(self) <= SEEN;
      if (had || near) { setDug({ find, mine: had }); if (near) glint.current = { kind: find.kind, since: null }; sfx?.wake(); sfx?.work("pick", 0.5); }
    }
    if (spans > before.spans && fresh) setFeast({ span: spans, whole, names: bridge?.built[String(spans)] ?? [], all: bridge?.helpers.length ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by what the works tell, not by the sound's identity or who is where
  }, [held, spans, mine, finds.length, have, open, th]);

  // ── the sign's panel ──
  const [panel, setPanel] = useState(false);
  /** What a tap asked for and I am walking to: the pile (a stone is lifted on arriving) or the sign (its panel opens). */
  const want = useRef<"pile" | "sign" | null>(null);
  const bySign = !!here && nearTile(here, SIGN, READ);
  useEffect(() => { if (!bySign || !open) setPanel(false); }, [bySign, open]);
  useEffect(() => { if (panel) void keeper.worksLook(); }, [panel, keeper]);
  useEffect(() => {
    if (!panel) return;
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setPanel(false); } };
    const again = setInterval(() => void keeper.worksLook(), 15_000);
    window.addEventListener("keydown", down);
    return () => { window.removeEventListener("keydown", down); clearInterval(again); };
  }, [panel, keeper]);
  // Walked up to what was tapped: the stone is lifted, or the sign is read.
  const hereKey = here ? `${here[0]},${here[1]}` : "";
  useEffect(() => {
    const at = hereRef.current, w = want.current;
    if (!w || !at) return;
    if (w === "pile" && nearTile(at, BRIDGE.pile)) { want.current = null; void lift(); }
    else if (w === "sign" && nearTile(at, SIGN, READ)) { want.current = null; setPanel(true); }
  }, [hereKey, lift]);

  // The map draws the pile, the sign and the building, and asks here whether a tap was on one of them.
  const boxes = useRef<{ pile: Box | null; sign: Box | null; banner: Box | null }>({ pile: null, sign: null, banner: null });
  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, s, now, still } = frame;
      boxes.current = { pile: null, sign: null, banner: null };
      const k = kit.current, w = worksRef.current?.works[BRIDGE.work];
      if (!k || !w) return;
      const px = Math.abs(ctx.getTransform().a) || 1;
      const boxOf = (name: string, at: Vec, z: number, pad = 0): Box => { const [pw, ph] = k.sizeOf(name), [ax, ay] = k.anchorOf(name); return { x0: at.x - ax * z - pad, y0: at.y - ay * z - pad, x1: at.x + (pw - ax) * z + pad, y1: at.y + (ph - ay) * z + pad }; };
      // the pile by the shop: under its cloth until the bridge is opened. It stops nobody (no tile is closed for it).
      const pile = w.open ? "stonePile" : "stonePileCloth", at = project({ x: BRIDGE.pile.x + 0.5, y: BRIDGE.pile.y + 0.62 });
      if (k.has(pile) && onScreen(at)) {
        const z = s * PILE_K;
        if (w.open) boxes.current.pile = boxOf(pile, at, z);
        things.push({ depth: BRIDGE.pile.x + BRIDGE.pile.y + 1, draw: () => k.drawProp(ctx, pile, at.x, at.y, z, px) });
      }
      if (!w.open) return;
      const n = w.needs[BRIDGE.thing], building = !!n && n.need !== null && n.have < n.need;
      // the sign at the foot: its bar is the village's, a notch a span
      const post = project({ x: SIGN.x + 0.5, y: SIGN.y + 0.62 });
      if (k.has("bridgeSign") && onScreen(post)) {
        const z = s * SIGN_K, [ax, ay] = k.anchorOf("bridgeSign");
        const share = n?.need ? Math.max(0, Math.min(1, n.have / n.need)) : 0;
        boxes.current.sign = boxOf("bridgeSign", post, z, 4);
        things.push({ depth: SIGN.x + SIGN.y + 1, draw: () => {
          k.drawProp(ctx, "bridgeSign", post.x, post.y, z, px);
          const snap = (v: number) => Math.round(v * px) / px, x0 = snap(post.x + (BAR.x - ax) * z), y0 = snap(post.y + (BAR.y - ay) * z), bw = BAR.w * z, bh = Math.max(1, BAR.h * z);
          ctx.fillStyle = "#3a2412";
          ctx.fillRect(x0 - z, y0 - z, bw + 2 * z, bh + 2 * z);
          ctx.fillStyle = "#8a6a45";
          ctx.fillRect(x0, y0, bw, bh);
          ctx.fillStyle = "#7fd08a";
          ctx.fillRect(x0, y0, bw * share, bh);
          // (a notch between two spans)
          ctx.fillStyle = "#3a2412";
          for (let i = 1; i < BRIDGE.spans; i++) ctx.fillRect(snap(x0 + (bw * i) / BRIDGE.spans), y0, Math.max(1 / px, z * 0.5), bh);
          // (a span is feasted: a lantern on the sign's post for as long)
          if (feasting.current && k.has("feastLantern")) k.drawProp(ctx, "feastLantern", post.x + 22 * z, post.y - 28 * z, z * 0.6, px);
        } });
      }
      if (!building) return;
      // ── while it is being built: where a row would stand, the banner at the foot, and the course that grows there.
      // All only drawn: nobody is stopped by any of it, and no tile's walking changes.
      if (k.has("standMark")) for (const m of stands()) {
        const c = project({ x: m.x + 0.5, y: m.y + 0.5 });
        if (!onScreen(c)) continue;
        // (flat on the ground: under whoever stands on its tile, and under whatever stands before it)
        const [, mh] = k.sizeOf("standMark"), z = s * STAND_K;
        things.push({ depth: m.x + m.y + 0.2, draw: () => k.drawProp(ctx, "standMark", c.x, c.y + (mh / 2) * z, z, px) });
      }
      const flag = project({ x: BANNER_AT.x + 0.5, y: BANNER_AT.y + 0.62 });
      if (k.has("bridgeBanner") && onScreen(flag)) {
        const z = s * BANNER_K;
        boxes.current.banner = boxOf("bridgeBanner", flag, z, 2);
        // (its cloth leans a little, slowly, as the town's trees do)
        things.push({ depth: BANNER_AT.x + BANNER_AT.y + 1, draw: () => {
          k.drawProp(ctx, "bridgeBanner", flag.x, flag.y, z, px, 0, false, still ? 0 : 0.012 * Math.sin(now / 1900));
          if (feasting.current && k.has("feastLantern")) k.drawProp(ctx, "feastLantern", flag.x - 14 * z, flag.y - 70 * z, z * 0.7, px);
        } });
      }
      const site = project({ x: COURSE_AT.x + 0.5, y: COURSE_AT.y + 0.62 });
      if (k.has("courseA") && onScreen(site)) {
        const z = s * SITE_K, { step, more } = course(n!.have, n!.need), depth = COURSE_AT.x + COURSE_AT.y + 1;
        const up = UP.slice(0, more).filter((u) => k.has(u.art));
        for (const u of up) things.push({ depth: depth + (u.behind ? -0.3 : 0.05 + u.dy * 0.01), draw: () => k.drawProp(ctx, u.art, site.x + u.dx * z, site.y + u.dy * z, z, px) });
        if (step > 0) things.push({ depth, draw: () => { for (const [dx, dy, name] of COURSE.slice(0, step)) k.drawProp(ctx, name, site.x + dx * STONE_W * z, site.y - dy * STONE_H * z, z, px); } });
      }
      // what was found in a stone just laid: it rises slowly from the course with a glint, and is gone
      const g = glint.current;
      if (g && onScreen(site)) {
        g.since ??= now;
        const t = (now - g.since) / GLINT_MS;
        if (t >= 1) glint.current = null;
        else {
          const z = s * SITE_K, name = findOf(g.kind).art, rise = (still ? 1 : Math.min(1, t * 2.2)) * 30, fade = t < 0.75 ? 1 : Math.max(0, (1 - t) / 0.25), pulse = still ? 1 : 0.75 + 0.25 * Math.sin(now / 420);
          things.push({ depth: COURSE_AT.x + COURSE_AT.y + 3, draw: () => {
            ctx.save();
            ctx.globalAlpha = fade;
            if (k.has(name)) k.drawProp(ctx, name, site.x, site.y - (26 + rise) * z, z * 0.8, px);
            ctx.globalAlpha = fade * pulse;
            if (k.has("glint")) { k.drawProp(ctx, "glint", site.x - 16 * z, site.y - (50 + rise) * z, z * 0.8, px); k.drawProp(ctx, "glint", site.x + 18 * z, site.y - (34 + rise) * z, z * 0.6, px); }
            ctx.restore();
          } });
        }
      }
    });
    registerTap((x, y, peek = false) => {
      const hit = (b: Box | null) => !!b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
      const b = boxes.current, at = hereRef.current;
      const far = (t: Vec) => (at ? Math.hypot(t.x - at[0], t.y - at[1]) : 0);
      const beside = (t: Vec, reach: number) => [[1, 1], [1, 0], [0, 1], [-1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1]].map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy }))
        .filter((c) => walkable(c.x, c.y) && nearTile([c.x, c.y], t, reach)).sort((p, q) => far(p) - far(q))[0] ?? null;
      // (the banner is the foot's own mark: a tap on it reads the sign too)
      if (hit(b.sign) || hit(b.banner)) {
        if (peek) return { walk: null };
        if (at && nearTile(at, SIGN, READ)) { want.current = null; setPanel(true); return { walk: null }; }
        want.current = "sign";
        return { walk: beside(SIGN, READ) };
      }
      if (hit(b.pile)) {
        if (peek) return { walk: null };
        const told = worksRef.current;
        // (with a stone in my hands already, or nothing more wanted, the pile is only walked up to)
        if (at && nearTile(at, BRIDGE.pile)) { want.current = null; if (!carrying(told) && !bridgeWhole(told)) void lift(); return { walk: null }; }
        want.current = carrying(told) || bridgeWhole(told) ? null : "pile";
        return { walk: beside(BRIDGE.pile, BRIDGE.near) };
      }
      if (!peek) want.current = null;
      return null;
    });
    return () => { register(null); registerTap(null); };
  }, [register, registerTap, lift]);

  // (for scripts in `next dev`: the works as kept, the trial's own switches, what is offered, what is said, and each deed)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      works: () => keeper.works(), spans: () => bridgeSpans(keeper.works()), whole: () => bridgeWhole(keeper.works()), held: () => carrying(keeper.works()),
      open: (on = true) => keeper.trial?.worksOpen(on), have: (n: number) => keeper.trial?.worksHave(n), anew: () => keeper.trial?.worksAnew(), mark: (kind: string | null) => keeper.trial?.worksMark(kind),
      here: () => hereRef.current, atPile: () => atPile, atFoot: () => atFoot, offered: () => offered.map((p) => p.id), lacks: () => (lacks ? { who: lacks.who.id, why: lacks.why } : null),
      holds: () => Object.fromEntries(offered.map((p) => [p.id, holdFor(tired, p.spent)])), tired: () => tired,
      lift, lay, drop: async () => keeper.stoneDrop(), pass: (id: string) => { const to = offered.find((p) => p.id === id); if (to) void passTo(to); },
      idle: () => ({ busy: busyRef.current, panel }), note: () => note, toast: () => toast, earned: () => earned, dug: () => (dug ? { kind: dug.find.kind, mine: dug.mine, hands: dug.find.hands.map((h) => h.id) } : null),
      feast: () => (feast ? { span: feast.span, whole: feast.whole, names: feast.names.map((h) => h.id) } : null), glint: () => glint.current?.kind ?? null,
      course: () => { const n = keeper.works()?.works[BRIDGE.work]?.needs[BRIDGE.thing]; return n ? course(n.have, n.need) : null; },
      panel: (on = true) => setPanel(on), isPanel: () => panel, boxes: () => boxes.current, drawn: () => drawn,
      pile: BRIDGE.pile, foot: BRIDGE.foot, sign: SIGN, banner: BANNER_AT, site: COURSE_AT, marks: stands(), reach: BRIDGE.reach, near: BRIDGE.near, need: BRIDGE.need, hold: BRIDGE.hold, kinds: MARKS,
    };
    (window as unknown as { __townBridge?: typeof handle }).__townBridge = handle;
    return () => { delete (window as unknown as { __townBridge?: typeof handle }).__townBridge; };
  });

  if (!open || !need) return null;
  const stone = art("stoneHeld");
  const step = held ? (atFoot ? 2 : 1) : 0;
  const span = Math.min(BRIDGE.spans, spans + 1);
  const title = th ? "สะพานจากมือชาวบ้าน" : "The bridge built by hand";
  const pill = "pop-in pressable pointer-events-auto flex min-h-11 max-w-[22rem] items-center gap-2 rounded-full border bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors disabled:opacity-60";
  const offering = !panel && !!here && (held ? true : atPile && !whole);
  const built = Object.entries(bridge!.built).map(([n, hands]) => ({ n: Number(n), hands })).filter((b) => b.n > 0 && b.hands.length).sort((a, b) => a.n - b.n);
  /** The kinds I have had a hand in: found, they are shown as they are; the rest as shadows. */
  const kinds = new Set(finds.filter((f) => f.hands.some((h) => h.id === me || h.id === keeper.id)).map((f) => f.kind));
  const names = (list: Named[]) => list.map(called).join(th ? " · " : ", ");
  return (
    <>
      {(toast || earned || dug || feast) && (
        <TownFoot rank="toast" order={34}>
          {(feast || earned || dug) && <style>{FEAST_CSS}</style>}
          {feast && (
            // (a span laid, or the bridge whole: every page of the town, for a few seconds, slowly; a tap puts it away)
            <div role="status" aria-live="polite" onClick={() => setFeast(null)} data-bridge-feast={feast.span} data-whole={feast.whole}
                 className="bridge-feast pointer-events-auto relative w-[26rem] max-w-full cursor-pointer overflow-hidden rounded-2xl border border-gold/60 bg-surface/95 px-4 pb-3 pt-9 text-center shadow-xl shadow-black/40 backdrop-blur-sm">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                <Art sprite={art("feastBunting")} box={208} wide /><Art sprite={art("feastBunting")} box={208} wide />
              </span>
              <span aria-hidden data-sway className="pointer-events-none absolute left-2 top-5"><Art sprite={art("feastLantern")} box={38} /></span>
              <span aria-hidden data-sway className="pointer-events-none absolute right-2 top-5" style={{ animationDelay: "-2.1s" }}><Art sprite={art("feastLantern")} box={38} /></span>
              {[12, 30, 50, 68, 86].map((left, i) => (
                <span key={left} aria-hidden data-fall className="pointer-events-none absolute top-6" style={{ left: `${left}%`, animationDelay: `${-i * 1.4}s` }}><Art sprite={art("feastConfetti")} box={22} /></span>
              ))}
              <div className="relative flex flex-col items-center gap-1">
                <Art sprite={art("feastWreath")} box={52} />
                <p className="font-display text-title font-semibold text-ink">
                  {feast.whole ? (th ? "สะพานเสร็จสมบูรณ์แล้ว!" : "The bridge is whole!") : th ? `ช่วงที่ ${feast.span} จาก ${BRIDGE.spans} เสร็จแล้ว!` : `Span ${feast.span} of ${BRIDGE.spans} is laid!`}
                </p>
                {feast.names.length > 0 && (
                  <p className="max-w-full text-ui leading-relaxed text-ink" data-bridge-feast-names>
                    <span className="text-muted">{th ? `ช่วงที่ ${feast.span} วางโดย ` : `Span ${feast.span}, laid by `}</span>{names(feast.names)}
                  </p>
                )}
                <p className="text-meta text-muted">
                  {feast.whole ? (th ? `ขอบคุณทุกมือที่ช่วยกัน ทั้ง ${feast.all} คน` : `Thank you, every hand: all ${feast.all}`) : th ? "ชื่อทุกคนอยู่บนป้ายที่เชิงสะพาน" : "Every name is on the sign at the bridge's foot"}
                </p>
              </div>
            </div>
          )}
          {earned && (
            // (a stone I had a hand in is laid: what it earned me, wherever I stand)
            <p className="bridge-rise flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-gold/60 bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" aria-live="polite" data-bridge-earned={earned.n}>
              <Art sprite={stone} box={20} />
              <span className="font-data tabular-nums text-gold">+{earned.n}</span>
              <span>{th ? "ก้อน" : earned.n === 1 ? "stone" : "stones"}</span>
              {earned.of > 0 && <span className="font-normal text-muted">· <span className="font-data tabular-nums text-ink">{earned.at}/{earned.of}</span> {th ? "ของช่วงนี้" : "of this span"}</span>}
              {/* (no number: how much a stone counts on the helpers' line hangs on the day's bound, which this page may know late; the ladder says the points) */}
              <span className="rounded-full bg-jade/15 px-2 py-0.5 text-meta font-semibold text-jade" data-bridge-point>
                {th ? "ได้แต้มผู้ช่วย" : "counts on the helpers' line"}
              </span>
            </p>
          )}
          {dug && (
            // (something was in the stone: seen now that it is laid)
            <p className="bridge-rise flex max-w-[24rem] items-center gap-2 rounded-2xl border border-line-lit bg-surface/95 px-4 py-2 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" aria-live="polite" data-bridge-dug={dug.find.kind}>
              <Art sprite={art(findOf(dug.find.kind).art)} box={36} />
              <span className="min-w-0 leading-snug">
                <b className="font-semibold">{dug.mine ? (th ? `ในหินก้อนนี้มี${findOf(dug.find.kind).th}!` : `There was ${findOf(dug.find.kind).en} in that one!`) : th ? `พบ${findOf(dug.find.kind).th}ในหินที่เพิ่งวาง!` : `${findOf(dug.find.kind).en.replace(/^./, (c) => c.toUpperCase())} was in the stone just laid!`}</b>
                <span className="block text-meta text-muted">{th ? `ฝังไว้ในสะพานแล้ว จากมือของ ${names(dug.find.hands)}` : `Set in the bridge, from the hands of ${names(dug.find.hands)}`}</span>
              </span>
            </p>
          )}
          {toast && (
            <p className="pop-in flex items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-bridge-toast>
              <Art sprite={stone} box={20} />
              {toast}
            </p>
          )}
        </TownFoot>
      )}
      {(offering || note) && !panel && (
        <TownFoot rank="chip" order={26}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-bridge-note>{note}</p>}
          {offering && (
            <div className="pop-in pointer-events-auto w-[26rem] max-w-full rounded-2xl border border-line-lit bg-surface/92 p-2 shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-bridge-card={held ? "held" : "pile"}>
              {/* how it is done: three steps, the one to do now lit; and one line said beforehand */}
              <Steps th={th} at={step} />
              <p className="mt-1.5 px-1 text-center text-label leading-snug text-muted" data-bridge-hint={held ? "counts" : "where"}>{held ? (th ? COUNTS[0] : COUNTS[1]) : th ? WHERE[0] : WHERE[1]}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {!held ? (
                  hand ? (
                    // (a thing in the hand: nothing to press, and what is lacking is said)
                    <p className="flex items-center gap-2 rounded-full border border-line bg-bg/80 px-4 py-2 text-ui text-muted" aria-live="polite" data-bridge-lacks="mine">
                      <Art sprite={stone} box={18} />
                      {th ? "เก็บของที่ถืออยู่ก่อน ถึงจะยกหินได้" : "Put away what you hold to lift a stone"}
                    </p>
                  ) : (
                    <button type="button" onClick={() => void lift()} disabled={busy} data-bridge-lift className={`${pill} border-gold/70 hover:border-gold`}>
                      <Art sprite={stone} box={24} />
                      {th ? "ยกหิน" : "Lift a stone"}
                    </button>
                  )
                ) : (
                  <>
                    {atFoot && !whole && (
                      <button type="button" onClick={() => void lay()} disabled={busy} data-bridge-lay className={`${pill} border-gold/70 hover:border-gold`}>
                        <Art sprite={stone} box={24} />
                        {th ? "วางหินที่เชิงสะพาน" : "Lay the stone"}
                      </button>
                    )}
                    {/* one for each of those it may go to, the likeliest first and named in full: a press; or, where either of us has no stamina, a hold that fills */}
                    {offered.map((p, i) => {
                      const secs = holdFor(tired, p.spent), name = p.name || (th ? "เพื่อน" : "them");
                      return secs > 0 ? (
                        <HoldButton key={p.id} secs={secs} who={p.id} disabled={busy} onDone={() => void passTo(p)} onEarly={early} className={`${pill} border-line-lit hover:border-accent`}>
                          <Art sprite={stone} box={20} />
                          <span className="min-w-0 truncate">{i === 0 ? (th ? `กดค้างไว้ ส่งหินให้ ${name}` : `Hold to hand it to ${name}`) : th ? `หรือกดค้าง: ${name}` : `or hold: ${name}`}</span>
                        </HoldButton>
                      ) : (
                        <button key={p.id} type="button" onClick={() => void passTo(p)} disabled={busy} data-bridge-chip={p.id} data-hold={0} className={`${pill} border-line-lit hover:border-accent`}>
                          <Art sprite={stone} box={20} />
                          <span className="min-w-0 truncate">{i === 0 ? (th ? `ส่งหินต่อให้ ${name}` : `Hand it on to ${name}`) : th ? `หรือ ${name}` : `or ${name}`}</span>
                        </button>
                      );
                    })}
                    {!offered.length && lacks && (
                      // (nobody to hand it to: who stands close by, and what they lack. Nothing to press.)
                      <p className="flex max-w-[22rem] items-center gap-2 rounded-full border border-line bg-bg/80 px-4 py-2 text-ui text-muted" aria-live="polite" data-bridge-lacks={lacks.why}>
                        <span className="min-w-0">{LACKS[lacks.why][th ? 0 : 1](lacks.who.name || (th ? "เพื่อน" : "Your friend"))}</span>
                      </p>
                    )}
                    <button type="button" onClick={() => void letGo()} disabled={busy} data-bridge-drop={sure ? "sure" : "ask"}
                            className={`pressable pointer-events-auto min-h-11 rounded-full border px-3 text-meta transition-colors ${sure ? "border-chili bg-chili/15 font-semibold text-ink" : "border-line text-muted hover:text-ink"}`}>
                      {sure ? (th ? "กดอีกครั้ง: หินจะหายไป" : "Press again: the stone is gone") : th ? "ปล่อยหิน" : "Let it go"}
                    </button>
                  </>
                )}
              </div>
              {held && tired && offered.length > 0 && (
                <p className="mt-1.5 px-1 text-center text-label leading-snug text-muted" data-bridge-weary>{th ? "หมดแรงแล้ว: กดปุ่มค้างไว้จนแถบเต็ม หินไม่มีวันหล่น" : "Out of stamina: hold the button until it fills. The stone never drops"}</p>
              )}
            </div>
          )}
        </TownFoot>
      )}
      {panel && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 max-h-[min(84%,42rem)] rounded-t-2xl"
               : "right-3 top-16 w-[24rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { maxHeight: "calc(100% - 4.75rem)" }}
             data-state="open" data-bridge-panel>
          <section aria-labelledby="town-bridge-h" className="flex max-h-[inherit] flex-col">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Art sprite={art("bridgeSign")} box={34} />
              <h2 id="town-bridge-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{title}</h2>
              <button type="button" onClick={() => setPanel(false)} data-bridge-close className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
                {th ? "ปิด" : "Close"}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              {/* the village's bar: so many of so many, and which span of six */}
              <div className="rounded-2xl border border-line bg-bg/60 p-3" data-bridge-bar={need.have}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-ui font-semibold text-ink">{whole ? (th ? "สะพานเสร็จสมบูรณ์แล้ว" : "The bridge is whole") : th ? `กำลังต่อช่วงที่ ${span} จาก ${BRIDGE.spans}` : `Span ${span} of ${BRIDGE.spans}`}</p>
                  <p className="font-data text-read tabular-nums text-ink" data-bridge-have>{need.have.toLocaleString()}<span className="text-muted"> / {(need.need ?? 0).toLocaleString()}</span></p>
                </div>
                <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${BRIDGE.spans}, minmax(0, 1fr))` }} role="img"
                     aria-label={th ? `วางหินแล้ว ${need.have} จาก ${need.need ?? 0} ก้อน` : `${need.have} of ${need.need ?? 0} stones laid`}>
                  {Array.from({ length: BRIDGE.spans }, (_, i) => {
                    const per = (need.need ?? 0) / BRIDGE.spans, fill = per > 0 ? Math.max(0, Math.min(1, (need.have - i * per) / per)) : 0;
                    return (
                      <span key={i} className="h-3 overflow-hidden rounded-full border border-line-strong bg-surface" data-span={i + 1} data-full={fill >= 1}>
                        <span className={`block h-full origin-left transition-transform duration-500 ${fill >= 1 ? "bg-jade" : "bg-gold"}`} style={{ transform: `scaleX(${fill})` }} />
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-meta text-muted">
                  <Art sprite={stone} box={16} />
                  {th ? "หินจากมือชาวบ้านทั้งเมือง ไม่มีเหรียญ ไม่มีของขาย มีแต่สะพาน" : "Stone from the whole village's hands: no coins, nothing to sell, only a bridge"}
                </p>
              </div>

              {/* how it is done, and the two lines said beforehand */}
              {!whole && (
                <div className="mt-3">
                  <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "วิธีเล่น" : "How it is done"}</h3>
                  <Steps th={th} at={step} wide />
                  <ul className="mt-2 grid gap-1 text-meta leading-relaxed text-muted" data-bridge-said>
                    <li className="flex items-start gap-1.5"><Art sprite={stone} box={16} /><span>{th ? COUNTS[0] : COUNTS[1]}</span></li>
                    <li className="flex items-start gap-1.5"><Art sprite={art("standMark")} box={16} /><span>{th ? WHERE[0] : WHERE[1]}</span></li>
                  </ul>
                </div>
              )}

              {/* my own count, to me alone */}
              <p className="mt-3 rounded-xl border border-line bg-bg/60 px-3 py-2 text-ui text-ink" data-bridge-mine={mine}>
                {mine > 0
                  ? (th ? <>หินที่ผ่านมือฉันไปถึงสะพาน <b className="font-data tabular-nums text-gold">{mine.toLocaleString()}</b> ก้อน</> : <>Stones that went through my hands: <b className="font-data tabular-nums text-gold">{mine.toLocaleString()}</b></>)
                  : th ? "ยังไม่มีหินที่ผ่านมือฉัน" : "No stone has gone through my hands yet"}
              </p>

              {/* each span, and whose hands laid it: names only, in the order they came to it */}
              {built.length > 0 && (
                <>
                  <h3 className="mb-1.5 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? "มือของแต่ละช่วง" : "The hands of each span"}</h3>
                  <ul className="grid gap-1.5" data-bridge-built>
                    {built.map((b) => (
                      <li key={b.n} data-span-hands={b.n} data-done={b.n <= spans} className="rounded-xl border border-line bg-bg/60 px-3 py-2 text-meta leading-relaxed text-ink">
                        <span className={`font-semibold ${b.n <= spans ? "text-jade" : "text-gold"}`}>{b.n <= spans ? (th ? `ช่วงที่ ${b.n} วางโดย ` : `Span ${b.n}, laid by `) : th ? `ช่วงที่ ${b.n} กำลังวางโดย ` : `Span ${b.n}, being laid by `}</span>
                        {names(b.hands)}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* what was found in the stones: set in the bridge for good, each with its hands; and the kinds I have had a hand in */}
              <h3 className="mb-1.5 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? `ของที่พบในหิน (${finds.length})` : `Found in the stones (${finds.length})`}</h3>
              <div className="rounded-xl border border-line bg-bg/60 px-3 py-2" data-bridge-kinds={kinds.size}>
                <p className="text-meta text-muted">{th ? "ที่ฉันมีส่วนพบ" : "Those I had a hand in"}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {MARKS.map((kind) => (
                    <li key={kind} data-kind={kind} data-found={kinds.has(kind)} title={kinds.has(kind) ? (th ? findOf(kind).th : findOf(kind).en) : th ? "ยังไม่เคยพบ" : "Not found yet"}
                        className={`grid size-12 place-items-center rounded-lg border ${kinds.has(kind) ? "border-gold/60 bg-gold/10" : "border-line bg-surface"}`}>
                      <Art sprite={art(findOf(kind).art)} box={36} shadow={!kinds.has(kind)} />
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-label leading-snug text-muted">{th ? "หินบางก้อนมีของอยู่ข้างใน จะรู้ก็ตอนวางลงสะพาน" : "Some stones have something in them. It shows when the stone is laid"}</p>
              </div>
              {finds.length > 0 && (
                <ul className="mt-1.5 grid gap-1.5" data-bridge-finds>
                  {finds.map((f, i) => (
                    <li key={`${f.at}-${i}`} data-find={f.kind} className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 px-3 py-2">
                      <Art sprite={art(findOf(f.kind).art)} box={34} />
                      <span className="min-w-0 text-meta leading-snug text-ink">
                        <b className="font-semibold">{th ? findOf(f.kind).th : findOf(f.kind).en.replace(/^./, (c) => c.toUpperCase())}</b>
                        {f.span > 0 && <span className="text-muted"> · {th ? `ช่วงที่ ${f.span}` : `span ${f.span}`}</span>}
                        <span className="block text-muted">{th ? "จากมือของ " : "From the hands of "}<span className="text-ink">{names(f.hands)}</span></span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* everybody who has helped, in the order they first came: no numbers, no ranking */}
              <h3 className="mb-1.5 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? `ชาวบ้านที่ร่วมสร้าง (${bridge!.helpers.length})` : `Built by (${bridge!.helpers.length})`}</h3>
              {bridge!.helpers.length ? (
                <ul className="flex flex-wrap gap-1.5" data-bridge-names>
                  {bridge!.helpers.map((h) => (
                    <li key={h.id} data-id={h.id} className={`max-w-full truncate rounded-full border px-2.5 py-1 text-meta ${h.id === keeper.id || h.id === me ? "border-gold/60 bg-gold/10 text-ink" : "border-line bg-bg/60 text-ink"}`}>
                      {called(h)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-meta leading-relaxed text-muted">{th ? "ยังไม่มีใครวางหิน มาเป็นคนแรกกันไหม" : "Nobody has laid a stone yet. Be the first?"}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

interface Box { x0: number; y0: number; x1: number; y1: number }
