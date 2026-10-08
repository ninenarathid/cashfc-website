"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BRIDGE, bridgeSpans, bridgeWhole, carrying, nearTile, takers, type Hand, type Lack } from "@/lib/town/bridge";
import type { Keeper } from "@/lib/town/keeper";
import type { SceneryKit, Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { handOf } from "@/lib/town/trade";
import { walkable, type Vec } from "@/lib/town/world";
import { loadWorksArt } from "@/lib/town/works-art";
import type { FarmDraw } from "./TownFarm";

export type { Hand };
/** What a tap on the map came to here: nothing of the bridge's (null), or the pile's or the sign's: done where I stand, or to be walked to. With `peek` nothing is done. */
export type BridgeTap = (x: number, y: number, peek?: boolean) => { walk: Vec | null } | null;

/** Where the sign stands: beside the foot, away from the water (one tile to the right of it on the screen), wherever the foot is. */
const SIGN: Vec = { x: BRIDGE.foot.x + 1, y: BRIDGE.foot.y - 1 };
/** How near the sign one stands to read it, in tiles. */
const READ = 3;
/** How large the pile and the sign are drawn, as shares of their pictures' own size. */
const PILE_K = 0.95, SIGN_K = 0.9;
/** The bar on the sign's board, in the sign's own pixels from its picture's corner: where it begins, how long and how high it is. */
const BAR = { x: 13, y: 43, w: 27, h: 3 };

/** Why not, in the bridge's own words: for whoever lifts and lays, and for a stone handed on. */
const WHY_MINE: Record<string, [th: string, en: string]> = {
  closed: ["สะพานยังไม่เปิดให้สร้าง", "The bridge is not open yet"], whole: ["สะพานเสร็จแล้ว ไม่ต้องใช้หินเพิ่ม", "The bridge is whole: it needs no more stone"],
  far: ["ต้องยืนใกล้กว่านี้", "Stand nearer"], hand: ["เก็บของที่ถืออยู่ก่อน ถึงจะยกหินได้", "Put away what you hold first"],
  held: ["ถือหินอยู่แล้ว", "You hold a stone already"], none: ["ไม่ได้ถือหินอยู่", "You hold no stone"], away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "The town could not be reached: try again"],
};
const WHY_PASS: Record<string, [th: string, en: string]> = {
  ...WHY_MINE, hand: ["อีกฝ่ายถือของอยู่ ยังรับหินไม่ได้", "They have a thing in their hand"], held: ["อีกฝ่ายถือหินอยู่แล้ว", "They hold a stone already"],
  none: ["ไม่มีใครรับหิน", "Nobody is there to take it"],
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

/** One of the works' own pictures, cut out of the scenery's picture: its pixels kept square. */
function Art({ sprite, box }: { sprite: Sprite | null; box: number }) {
  if (!sprite) return <span aria-hidden className="shrink-0" style={{ width: box, height: box }} />;
  const [x, y, w, h] = sprite.at, k = box / Math.max(w, h);
  return (
    <span aria-hidden className="grid shrink-0 place-items-center" style={{ width: box, height: box }}>
      <span style={{ width: w * k, height: h * k, backgroundImage: `url(${sprite.src})`, backgroundSize: `${sprite.sheet[0] * k}px ${sprite.sheet[1] * k}px`, backgroundPosition: `${-x * k}px ${-y * k}px`, imageRendering: "pixelated" }} />
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
 * The bridge built by hand (lib/town/bridge; the owner, 2026-10-08: "สะพานจากมือชาวบ้าน", and of every such piece:
 * "ขอ UI ดีๆเท่าที่จะเป็นไปได้ mini game เข้าใจไม่ยาก ถ้าเข้าใจยากเขียนวิธีเล่นไว้คร่าวๆด้วย").
 *
 * A pile of stone stands by the uncle's shop, under a cloth until the bridge is opened. Standing by it with empty
 * hands, a button lifts a stone (a tap on the pile walks up to it and lifts one). The stone is seen in my hands by
 * everybody, and I walk at half the pace with it. Standing still with one, whoever stands still with empty hands
 * within six tiles is offered by name, three at the most, those nearer the bridge's foot first: a press, and it is in
 * their hands. With nobody to offer, whoever stands close by is named with what they lack. At the foot a button lays
 * it. It can be let go of anywhere (two presses: it is gone for good).
 *
 * **How it is done is said in three steps, the one to do now lit**: over the buttons at the pile and while a stone is
 * held, and on the sign. The sign stands at the foot; a tap on it (it is walked up to first) opens its panel: the
 * village's bar, so many of six hundred and which span of six; the three steps; everybody who has helped, in the
 * order they first came, with no numbers and no ranking; and my own count, shown to me alone.
 *
 * The map draws the pile and the sign through here (their own picture: lib/town/works-art); the stone in somebody's
 * hands is the map's own to draw, with everybody else.
 *
 * What is kept is the keeper's: for a member the database's (v160), in `next dev`'s test room the browser's trial.
 * A keeper that knows of no works (the database before v160) shows nothing; a bridge that is not open shows only its
 * pile under the cloth.
 */
export default function TownBridge({ keeper, me, th, here, people, bottom, sfx, phone, tabbar, register, registerTap, carry }: {
  keeper: Keeper;
  me: string;
  th: boolean;
  /** The tile I stand still on, while nothing else is open over the map; null otherwise. */
  here: [number, number] | null;
  /** Everybody on the map now, as the map has them. */
  people: () => Hand[];
  /** How far up from the foot of the map what is offered sits. */
  bottom: string;
  sfx: FishSfx | null;
  phone: boolean;
  tabbar: boolean;
  /** Hand the map the way to draw the pile and the sign, and the way to ask whether a tap was on one of them (and take each back with null). */
  register: (draw: FarmDraw | null) => void;
  registerTap: (tap: BridgeTap | null) => void;
  /** Tell the room what I carry in my hands (a stone), or that they are free of it. */
  carry: (thing: string | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const works = keeper.works(), bridge = works?.works[BRIDGE.work] ?? null, open = !!bridge?.open;
  const need = bridge?.needs[BRIDGE.thing] ?? null, spans = bridgeSpans(works), whole = bridgeWhole(works), held = carrying(works);
  const purse = keeper.purse(), hand = handOf(purse);

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
  // While the bridge is being built it is read again now and then (a stone handed to me is told through the room at
  // once; this is for a word the room lost, and for the bar).
  useEffect(() => (open && !whole ? keeper.look("works") : undefined), [keeper, open, whole]);

  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 3000); return () => clearTimeout(t); }, [note]);
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
    sfx?.wake();
    sfx?.work("knock", 0.9);
    if (did.whole) setToast(th ? "สะพานเสร็จสมบูรณ์แล้ว! ขอบคุณทุกมือที่ช่วยกัน" : "The bridge is whole! Thank you, every hand");
    else if (did.span) setToast(th ? `ต่อสะพานได้อีกช่วงแล้ว! (ช่วงที่ ${did.spans} จาก ${BRIDGE.spans})` : `Another span is laid! (${did.spans} of ${BRIDGE.spans})`);
    else setNote(th ? "วางหินแล้ว" : "The stone is laid");
  }, [keeper, sfx, say, th]);
  const passTo = useCallback(async (to: Hand) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    const did = await keeper.stonePass(to.id);
    busyRef.current = false; setBusy(false);
    if (!did.ok) { say(WHY_PASS, did.why); return; }
    sfx?.wake();
    sfx?.work("pick", 0.6);
    setNote(th ? `ส่งหินให้ ${to.name || "เพื่อน"} แล้ว` : `Handed to ${to.name || "them"}`);
  }, [keeper, sfx, say, th]);
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

  // A stone that comes into my hands by somebody's hand, and a span the village laid while I looked on: said once each.
  const was = useRef<{ held: string | null; spans: number } | null>(null);
  useEffect(() => {
    const before = was.current;
    was.current = { held, spans };
    if (!before || !open) return;
    if (held && !before.held) {
      if (lifting.current) lifting.current = false;
      else { setToast(th ? "มีคนส่งหินมาให้ ถือไว้แล้ว" : "Somebody handed you a stone"); sfx?.wake(); sfx?.work("pick", 0.7); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- by what I hold, not by the sound's identity
  }, [held, spans, open, th]);

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

  // The map draws the pile and the sign, and asks here whether a tap was on one of them.
  const boxes = useRef<{ pile: Box | null; sign: Box | null }>({ pile: null, sign: null });
  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, s } = frame;
      boxes.current = { pile: null, sign: null };
      const k = kit.current, w = worksRef.current?.works[BRIDGE.work];
      if (!k || !w) return;
      const px = Math.abs(ctx.getTransform().a) || 1;
      // the pile by the shop: under its cloth until the bridge is opened. It stops nobody (no tile is closed for it).
      const pile = w.open ? "stonePile" : "stonePileCloth", at = project({ x: BRIDGE.pile.x + 0.5, y: BRIDGE.pile.y + 0.62 });
      if (k.has(pile) && onScreen(at)) {
        const z = s * PILE_K, [pw, ph] = k.sizeOf(pile), [ax, ay] = k.anchorOf(pile);
        if (w.open) boxes.current.pile = { x0: at.x - ax * z, y0: at.y - ay * z, x1: at.x + (pw - ax) * z, y1: at.y + (ph - ay) * z };
        things.push({ depth: BRIDGE.pile.x + BRIDGE.pile.y + 1, draw: () => k.drawProp(ctx, pile, at.x, at.y, z, px) });
      }
      // the sign at the foot, once the bridge is open: its bar is the village's, a notch a span
      const post = project({ x: SIGN.x + 0.5, y: SIGN.y + 0.62 });
      if (w.open && k.has("bridgeSign") && onScreen(post)) {
        const z = s * SIGN_K, [sw, sh] = k.sizeOf("bridgeSign"), [ax, ay] = k.anchorOf("bridgeSign"), n = w.needs[BRIDGE.thing];
        const share = n?.need ? Math.max(0, Math.min(1, n.have / n.need)) : 0;
        boxes.current.sign = { x0: post.x - ax * z - 4, y0: post.y - ay * z - 4, x1: post.x + (sw - ax) * z + 4, y1: post.y + (sh - ay) * z + 4 };
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
        } });
      }
    });
    registerTap((x, y, peek = false) => {
      const hit = (b: Box | null) => !!b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
      const b = boxes.current, at = hereRef.current;
      const far = (t: Vec) => (at ? Math.hypot(t.x - at[0], t.y - at[1]) : 0);
      const beside = (t: Vec, reach: number) => [[1, 1], [1, 0], [0, 1], [-1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1]].map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy }))
        .filter((c) => walkable(c.x, c.y) && nearTile([c.x, c.y], t, reach)).sort((p, q) => far(p) - far(q))[0] ?? null;
      if (hit(b.sign)) {
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

  // (for scripts in `next dev`: the works as kept, the trial's own switches, what is offered, and each deed)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      works: () => keeper.works(), spans: () => bridgeSpans(keeper.works()), whole: () => bridgeWhole(keeper.works()), held: () => carrying(keeper.works()),
      open: (on = true) => keeper.trial?.worksOpen(on), have: (n: number) => keeper.trial?.worksHave(n), anew: () => keeper.trial?.worksAnew(),
      here: () => hereRef.current, atPile: () => atPile, atFoot: () => atFoot, offered: () => offered.map((p) => p.id), lacks: () => (lacks ? { who: lacks.who.id, why: lacks.why } : null),
      lift, lay, drop: async () => keeper.stoneDrop(), pass: (id: string) => { const to = offered.find((p) => p.id === id); return to ? passTo(to) : Promise.resolve(); },
      note: () => note, toast: () => toast, panel: (on = true) => setPanel(on), isPanel: () => panel, boxes: () => boxes.current, drawn: () => drawn,
      pile: BRIDGE.pile, foot: BRIDGE.foot, sign: SIGN, reach: BRIDGE.reach, near: BRIDGE.near, need: BRIDGE.need,
    };
    (window as unknown as { __townBridge?: typeof handle }).__townBridge = handle;
    return () => { delete (window as unknown as { __townBridge?: typeof handle }).__townBridge; };
  });

  if (!open || !need) return null;
  const stone = art("stoneHeld");
  const step = held ? (atFoot ? 2 : 1) : 0;
  const mine = bridge!.mine[BRIDGE.thing] ?? 0;
  const span = Math.min(BRIDGE.spans, spans + 1);
  const title = th ? "สะพานจากมือชาวบ้าน" : "The bridge built by hand";
  const pill = "pop-in pressable pointer-events-auto flex min-h-11 max-w-[22rem] items-center gap-2 rounded-full border bg-surface/95 px-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors disabled:opacity-60";
  const offering = !panel && !!here && (held ? true : atPile && !whole);
  return (
    <>
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-2">
          <p className="pop-in flex items-center gap-2 rounded-full border border-line-lit bg-surface/95 px-4 py-2 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-bridge-toast>
            <Art sprite={stone} box={20} />
            {toast}
          </p>
        </div>
      )}
      {(offering || note) && !panel && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
          {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite" data-bridge-note>{note}</p>}
          {offering && (
            <div className="pop-in pointer-events-auto w-full max-w-[26rem] rounded-2xl border border-line-lit bg-surface/92 p-2 shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-bridge-card={held ? "held" : "pile"}>
              {/* how it is done: three steps, the one to do now lit */}
              <Steps th={th} at={step} />
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
                    {/* one for each of those it may go to, the likeliest first and named in full */}
                    {offered.map((p, i) => (
                      <button key={p.id} type="button" onClick={() => void passTo(p)} disabled={busy} data-bridge-chip={p.id} className={`${pill} border-line-lit hover:border-accent`}>
                        <Art sprite={stone} box={20} />
                        <span className="min-w-0 truncate">{i === 0 ? (th ? `ส่งหินต่อให้ ${p.name || "เพื่อน"}` : `Hand it on to ${p.name || "them"}`) : th ? `หรือ ${p.name || "เพื่อน"}` : `or ${p.name || "them"}`}</span>
                      </button>
                    ))}
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
            </div>
          )}
        </div>
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

              {/* how it is done */}
              {!whole && (
                <div className="mt-3">
                  <h3 className="mb-1.5 font-data text-label uppercase tracking-wider text-muted">{th ? "วิธีเล่น" : "How it is done"}</h3>
                  <Steps th={th} at={step} wide />
                </div>
              )}

              {/* my own count, to me alone */}
              <p className="mt-3 rounded-xl border border-line bg-bg/60 px-3 py-2 text-ui text-ink" data-bridge-mine={mine}>
                {mine > 0
                  ? (th ? <>หินที่ผ่านมือฉันไปถึงสะพาน <b className="font-data tabular-nums text-gold">{mine.toLocaleString()}</b> ก้อน</> : <>Stones that went through my hands: <b className="font-data tabular-nums text-gold">{mine.toLocaleString()}</b></>)
                  : th ? "ยังไม่มีหินที่ผ่านมือฉัน" : "No stone has gone through my hands yet"}
              </p>

              {/* everybody who has helped, in the order they first came: no numbers, no ranking */}
              <h3 className="mb-1.5 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? `ชาวบ้านที่ร่วมสร้าง (${bridge!.helpers.length})` : `Built by (${bridge!.helpers.length})`}</h3>
              {bridge!.helpers.length ? (
                <ul className="flex flex-wrap gap-1.5" data-bridge-names>
                  {bridge!.helpers.map((h) => (
                    <li key={h.id} data-id={h.id} className={`max-w-full truncate rounded-full border px-2.5 py-1 text-meta ${h.id === keeper.id || h.id === me ? "border-gold/60 bg-gold/10 text-ink" : "border-line bg-bg/60 text-ink"}`}>
                      {nameOf(h.id, h.name) || (th ? "ชาวบ้าน" : "A villager")}
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
