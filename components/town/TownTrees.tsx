"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FellOutcome, FellingAsk } from "@/lib/town/felling";
import { works } from "@/lib/town/gifts";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Look } from "@/lib/town/look";
import type { TreeAge } from "@/lib/town/mountain";
import { powerLeft } from "@/lib/town/powers";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { ALL, GEM_FX, gemBy, has } from "@/lib/town/tools";
import { TREES, WOOD, axeOf, farFrom, lookOf, type FellOne, type Standing, type TreesTold } from "@/lib/town/trees";
import { walkable, type Vec } from "@/lib/town/world";
import { registerTap, setAncientLook, setTreeLooks } from "./mountain-art";
import type { FarmDraw } from "./TownFarm";
import TownFelling from "./TownFelling";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import { WHY } from "./TownTrade";
import { Vfx } from "./vfx";

/** What a tree that is not felled says of itself, by the state that refused it (states, never the rule behind them). */
const WHY_TREE: Record<string, [th: string, en: string]> = {
  stump: ["ยังไม่โต", "Not grown yet"], bite: ["ขวานนี้ฟันไม่เข้า", "This axe will not bite"], plus: ["ต้นไม้เก่าแก่ไม่สะเทือนเลย", "The ancient tree does not so much as tremble"],
  far: ["ยืนไกลเกินไป", "Too far to reach"], tool: ["ต้องถือขวาน", "It takes an axe in the hand"], spent: ["วันนี้ใช้ไปหมดแล้ว", "None left today"],
  dropped: ["ขวานหลุดมือ ต้นไม้ยังยืนอยู่", "The axe slipped: the tree stands"], stands: ["ไม่ทัน ต้นไม้ยังยืนอยู่", "Out of time: the tree stands"],
};
/** How long the card of what a go gave stays up, in milliseconds. */
const CARD_MS = 9000;
/** How far from its member a woodpecker goes to a grown tree, in tiles. */
const PERCH = 7;
const iconFor = (item: ItemId): IconName => { const name = iconOf(item); return (name in ICON_ATLAS.icons ? name : "log") as IconName; };
/** So many minutes, or hours and minutes, as a few letters over a stump. */
const leftOf = (ms: number, th: boolean): string => {
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  if (mins < 60) return th ? `${mins} นาที` : `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return th ? `${h} ชม. ${m} นาที` : `${h} h ${m} min`;
};

interface Working { id: number; trees: number[]; ask: FellingAsk; elder: boolean; from: [number, number] }
interface Card { felled: FellOne[]; got: Array<[ItemId, number]>; one: boolean; at: number }

/**
 * The mountain's trees, to fell (the owner, 2026-10-08: woodcutting). The rules are lib/town/trees'; the game is
 * lib/town/felling's, on its own board (components/town/TownFelling). The trees themselves are drawn by the map's
 * own module for these maps (components/town/mountain-art), from what this tells it: each tree's look, as whoever
 * keeps the game says who felled which and when.
 *
 * With an axe in the hand a tap on a tree walks up to it and begins; standing beside a grown one, one button
 * offers it. What a tree refuses is said as its state. What a go gave comes up on a small card. Over the map this
 * draws only what is somebody's own to see: how long a stump has to go for whoever has a woodpecker, a glint on the
 * grown trees for an axe that sees them, and the mark of a tree half cut.
 */
export default function TownTrees({ keeper, th, name, tile, near, look, reduced, sfx, bottom, busy, walk, register, registerPerch }: {
  keeper: Keeper;
  th: boolean;
  name: string;
  /** The tile I stand still on, when I do. */
  tile: [number, number] | null;
  /** Whether I am on the mountain's map: its trees are looked at afresh while I am. */
  near: boolean;
  look: Look | null;
  reduced: boolean;
  sfx: FishSfx | null;
  bottom: string;
  /** Something else has the screen: nothing is offered. */
  busy: boolean;
  /** Walk me to a tile. */
  walk: (x: number, y: number) => boolean;
  register: (draw: FarmDraw | null) => void;
  /** Hand the map the way to say where a woodpecker flies to from where its member stands (and take it back with null). */
  registerPerch: (perch: ((at: Vec) => Vec | null) | null) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!near) return;
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 2000);
    return () => { stop(); clearInterval(t); };
  }, [keeper, near]);
  useEffect(() => (near ? keeper.look("trees") : undefined), [near, keeper]);

  const told: TreesTold | null = keeper.trees(), toldRef = useRef<TreesTold | null>(null);
  toldRef.current = told;
  const purse = keeper.purse(), now = keeper.now(), axe = axeOf(purse);
  const [working, setWorking] = useState<Working | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 2600); return () => clearTimeout(t); }, [note]);
  useEffect(() => { if (!card) return; const t = setTimeout(() => setCard(null), CARD_MS); return () => clearTimeout(t); }, [card]);
  const vfx = useMemo(() => new Vfx(), []);
  const say = useCallback((why: string) => { const w = WHY_TREE[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  /** Every tree's look now, by its number: what the map draws. */
  const looks = useCallback((): Map<number, TreeAge> => {
    const t = toldRef.current, at = keeper.now(), out = new Map<number, TreeAge>();
    for (const d of t?.down ?? []) { const l = lookOf(t, d.id, at); if (l !== 3) out.set(d.id, l); }
    return out;
  }, [keeper]);
  // The map is told how every tree looks: when what is kept changes, and every couple of seconds as stumps grow.
  useEffect(() => {
    const all = looks();
    setTreeLooks([...all].filter(([id]) => id !== TREES.elder.id));
    setAncientLook(all.get(TREES.elder.id) === 0 ? 0 : 3);
  });
  useEffect(() => () => { setTreeLooks([]); setAncientLook(3); }, []);

  /* ── walking up to a tree ── */
  const want = useRef<number | null>(null), tileRef = useRef(tile), axeRef = useRef(axe), busyRef = useRef(busy || !!working);
  tileRef.current = tile; axeRef.current = axe; busyRef.current = busy || !!working;
  const beginning = useRef(false);
  const begin = useCallback(async (id: number) => {
    const from = tileRef.current;
    if (!from || beginning.current || busyRef.current) return;
    beginning.current = true;
    try {
      const did = await keeper.fellBegin(id, from);
      if (!did.ok) { say(did.why); return; }
      setCard(null);
      setWorking({ id, trees: did.trees, ask: did.ask, elder: did.elder, from });
    } finally { beginning.current = false; }
  }, [keeper, say]);
  /** A tap on a tree: with an axe in the hand it is walked up to and begun; with none it is a step, as anywhere. */
  const tapped = useCallback((id: number): boolean => {
    const t = WOOD.find((x) => x.id === id);
    if (!t || !axeRef.current || busyRef.current) return false;
    const from = tileRef.current;
    if (from && farFrom(t, from) <= TREES.reach) { void begin(id); return true; }
    // the nearest tile beside it that can be stood on
    const size = t.size ?? 1, me = from ?? [t.x, t.y + size], beside: Array<[number, number]> = [];
    for (let y = t.y - 1; y <= t.y + size; y++) for (let x = t.x - 1; x <= t.x + size; x++) {
      if ((x < t.x || x >= t.x + size || y < t.y || y >= t.y + size) && walkable(x, y)) beside.push([x, y]);
    }
    beside.sort((a, b) => Math.hypot(a[0] - me[0], a[1] - me[1]) - Math.hypot(b[0] - me[0], b[1] - me[1]));
    for (const [x, y] of beside) if (walk(x, y)) { want.current = id; return true; }
    return false;
  }, [begin, walk]);
  useEffect(() => {
    const stops = [registerTap("tree", (tap) => tapped(tap.id)), registerTap("ancient", () => tapped(TREES.elder.id))];
    return () => { for (const stop of stops) stop(); };
  }, [tapped]);
  // come to a stand beside the tree that was tapped: it begins; come to a stand anywhere else: it is forgotten
  useEffect(() => {
    const id = want.current;
    if (id === null || !tile) return;
    want.current = null;
    const t = WOOD.find((x) => x.id === id);
    if (t && farFrom(t, tile) <= TREES.reach) void begin(id);
  }, [tile, begin]);

  // The grown tree I stand beside, if I hold an axe: offered by one button (the nearest; the ancient tree before a pine).
  const here: Standing | null = near && tile && axe && !busy && !working
    ? WOOD.filter((t) => farFrom(t, tile) <= TREES.reach && lookOf(told, t.id, now) === 3)
      .sort((a, b) => Number(!!b.elder) - Number(!!a.elder) || Math.hypot(a.x - tile[0], a.y - tile[1]) - Math.hypot(b.x - tile[0], b.y - tile[1]))[0] ?? null
    : null;
  const hereId = here?.id ?? -1;
  // walking off leaves the board
  useEffect(() => {
    if (!working) return;
    const t = WOOD.find((x) => x.id === working.id);
    if (!tile || !t || farFrom(t, tile) > TREES.reach) setWorking(null);
  }, [working, tile]);

  /** A go is over: it is written down, judged by whoever keeps the game, and what it gave comes up on a card. */
  const done = useCallback(async (w: Working, out: FellOutcome, how: { one?: boolean; twice?: boolean }) => {
    setWorking(null);
    const mine = keeper.purse(), at = keeper.now(), first = WOOD.find((t) => t.id === w.id);
    if (!how.one) {
      keeper.record({ game: "felling", at, won: out.trees.some((t) => t.felled), secs: out.secs, spent: isSpent(mine, at), buff: null,
        what: first?.elder ? TREES.elderKind : TREES.kinds[(first?.tier ?? 1) - 1], need: out.trees.reduce((n, t) => n + t.chops, 0), hits: out.trees.reduce((n, t) => n + (t.felled ? t.chops : 0), 0), misses: out.misses });
    }
    const did = await keeper.fellDo({ tree: w.id, trees: out.trees.map((t) => ({ id: t.tree, felled: t.felled, misses: t.misses })), secs: out.secs, ...(how.one ? { one: true } : {}), ...(how.twice ? { twice: true } : {}) }, w.from, name);
    if (!did.ok) { say(did.why); return; }
    if (!did.felled.length) { say(out.dropped ? "dropped" : "stands"); return; }
    sfx?.wake();
    sfx?.work("pick");
    for (const f of did.felled) {
      const t = WOOD.find((x) => x.id === f.id);
      if (!t) continue;
      const mid = (t.size ?? 1) / 2, where = { x: t.x + mid, y: t.y + mid };
      vfx.add("leaves", where);
      vfx.add("dust", where);
      if (f.got[0]) vfx.add("pop", where, { icon: f.got[0][0], lift: 20 });
    }
    setCard({ felled: did.felled, got: did.got, one: did.one, at: Date.now() });
  }, [keeper, name, say, sfx, vfx]);

  /** The quickening root: the last stump I made grows back at once. */
  const rootId = card && axe && powerLeft(purse, "axRoot", now) > 0 && has(axe, "axRoot") ? [...card.felled].reverse().find((f) => f.id !== TREES.elder.id)?.id ?? null : null;
  const root = useCallback(async () => {
    if (rootId === null) return;
    const did = await keeper.fellRoot(rootId);
    if (!did.ok) { say(did.why); return; }
    const t = WOOD.find((x) => x.id === rootId);
    sfx?.wake(); sfx?.work("pluck");
    if (t) vfx.add("sparkle", { x: t.x + 0.5, y: t.y + 0.5 });
    setCard(null);
  }, [rootId, keeper, say, sfx, vfx]);

  /* ── what is drawn over the map ── */
  const eye = useRef({ pecker: false, glint: 0, th, knows: false });
  eye.current = { pecker: works(purse, "famWoodpecker"), glint: axe ? gemBy(axe, "light", GEM_FX.light.axe.glint) : 0, th, knows: !!axe && has(axe, "axElder") };
  const glinting = useRef(0), timed = useRef(0);
  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, s, now: t, still, self, sign, over } = frame;
      vfx.draw(frame);
      const said = toldRef.current, at = keeper.now(), e = eye.current;
      let glints = 0, times = 0;
      // a tree half cut: pale chips at its foot, and a notch in its trunk, for everybody
      for (const id of said?.half ?? []) {
        const tr = WOOD.find((x) => x.id === id);
        if (!tr) continue;
        const c = project({ x: tr.x + 0.5, y: tr.y + 0.62 });
        if (!onScreen(c)) continue;
        things.push({ depth: tr.x + tr.y + 1.02, draw: () => {
          const d = Math.max(2, Math.round(2.2 * s));
          ctx.fillStyle = "#f3d9a4";
          ctx.fillRect(Math.round(c.x - 5 * s), Math.round(c.y - 13 * s), 4 * d, 2 * d);
          ctx.fillStyle = "#2a190d";
          ctx.fillRect(Math.round(c.x - 5 * s), Math.round(c.y - 13 * s) - d, 4 * d, d);
          ctx.fillStyle = "#e9c98a";
          for (const [dx, dy] of [[-12, 1], [9, 2], [-4, 4], [13, -1]] as const) ctx.fillRect(Math.round(c.x + dx * s), Math.round(c.y + dy * s), d, d);
        } });
      }
      // how long each stump has to go: for whoever has a woodpecker at their heels; the ancient tree's, for an axe that knows it
      for (const d of said?.down ?? []) {
        if (d.until === undefined || at >= d.until) continue;
        const elder = d.id === TREES.elder.id;
        if (elder ? !e.knows : !e.pecker) continue;
        const tr = WOOD.find((x) => x.id === d.id);
        if (!tr) continue;
        const mid = (tr.size ?? 1) / 2, c = project({ x: tr.x + mid, y: tr.y + mid + 0.12 });
        if (!onScreen(c)) continue;
        times++;
        sign(leftOf(d.until - at, e.th), c.x, c.y - (elder ? 70 : 46) * s);
      }
      // an axe that sees them: every grown tree within its sight glints (on my own screen)
      if (e.glint > 0 && self) {
        for (const tr of WOOD) {
          if (tr.elder || tr.tier > TREES.axeTier) continue;
          if (e.glint < ALL && Math.hypot(tr.x + 0.5 - self.x, tr.y + 0.5 - self.y) > e.glint) continue;
          if (lookOf(said, tr.id, at) !== 3) continue;
          const c = project({ x: tr.x + 0.5, y: tr.y + 0.62 });
          if (!onScreen(c)) continue;
          glints++;
          const beat = still ? 0.8 : 0.5 + 0.5 * Math.sin(t / 420 + tr.id * 1.7), d = Math.max(2, Math.round(1.8 * s)), x = Math.round(c.x + 9 * s), y = Math.round(c.y - 58 * s);
          (over ?? ((fn: () => void) => fn()))(() => {
            ctx.fillStyle = `rgba(255,246,216,${(0.35 + 0.65 * beat).toFixed(3)})`;
            ctx.fillRect(x - 2 * d, y, 5 * d, d);
            ctx.fillRect(x, y - 2 * d, d, 5 * d);
          });
        }
      }
      glinting.current = glints;
      timed.current = times;
    });
    return () => register(null);
  }, [register, vfx, keeper]);

  // The woodpecker flies to the nearest grown tree about its member (anybody's woodpecker, on this page).
  useEffect(() => {
    registerPerch((at) => {
      const said = toldRef.current, when = keeper.now();
      let best: Standing | null = null, far = PERCH;
      for (const tr of WOOD) {
        if (tr.elder) continue;
        const d = Math.hypot(tr.x + 0.5 - at.x, tr.y + 0.5 - at.y);
        if (d < far && lookOf(said, tr.id, when) === 3) { best = tr; far = d; }
      }
      return best ? { x: best.x, y: best.y } : null;
    });
    return () => registerPerch(null);
  }, [registerPerch, keeper]);

  // The space bar is the button (while the board is up it is the board's).
  useEffect(() => {
    if (!here || working) return;
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      if ((e.key !== " " && e.code !== "Space") || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      void begin(here.id);
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the tree offered is known by its number
  }, [hereId, working, begin]);

  // (for scripts in `next dev`)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      /** What I am told of the trees, and how each that is not grown looks now. */
      told: () => toldRef.current, looks: () => Object.fromEntries(looks()),
      /** Every tree of the layout, with its tile. */
      wood: () => WOOD.map((t) => ({ ...t })),
      /** The tree offered where I stand; a tap on a tree, as the map hands one over; and the way to begin at one. */
      here: () => hereId, tap: (id: number) => tapped(id), begin: (id: number) => begin(id),
      working: () => (working ? { id: working.id, trees: working.trees, elder: working.elder, ask: working.ask } : null),
      card: () => (card ? { felled: card.felled, got: card.got, one: card.one } : null),
      note: () => note, root: () => root(), rootable: () => rootId,
      /** What this page draws for me alone: glints on grown trees, and times over stumps, as of the last frame. */
      glints: () => glinting.current, times: () => timed.current,
    };
    (window as unknown as { __townTrees?: typeof handle }).__townTrees = handle;
    return () => { delete (window as unknown as { __townTrees?: typeof handle }).__townTrees; };
  }, [hereId, tapped, begin, working, card, note, root, rootId, looks]);

  const nameOf = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const powers = axe ? { one: has(axe, "axOne") ? powerLeft(purse, "axOne", now) : 0, twice: has(axe, "axDouble") ? powerLeft(purse, "axDouble", now) : 0 } : undefined;
  if (!working && !here && !note && !card) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && (
        <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-trees-note aria-live="polite">{note}</p>
      )}
      {/* what the go gave: a small card of the town's wood */}
      {card && !working && (
        <section aria-label={th ? "ได้ไม้" : "Wood brought home"} data-trees-card data-state="open"
                 className="pop-in pointer-events-auto w-full max-w-[19rem] rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-2.5 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{th ? (card.felled.length > 1 ? `ล้ม ${card.felled.length} ต้น` : "ล้มแล้ว") : card.felled.length > 1 ? `${card.felled.length} trees felled` : "Timber"}</h2>
            <button type="button" onClick={() => setCard(null)} className="pressable -mr-1 ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">{th ? "ปิด" : "Close"}</button>
          </div>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {card.got.map(([id, n]) => (
              <li key={id} data-trees-got={id} data-n={n} className="flex items-center gap-1.5 rounded-[4px] border-2 border-[#2a190d] bg-[#4a2f18] py-1 pl-1.5 pr-2 text-ui text-[#ffeccb]">
                <TownIcon name={iconFor(id)} size={26} />{nameOf(id)}<span className="font-data tabular-nums text-[#ffe19a]">×{n}</span>
              </li>
            ))}
          </ul>
          {/* each tree of the go: a square, and the branches that struck */}
          {!card.one && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-[#e9cfa4]">
              {card.felled.map((f) => (
                <span key={f.id} className="flex items-center gap-1" data-trees-felled={f.id} data-misses={f.misses}>
                  <TownIcon name={"treeStump" as IconName} size={18} />
                  {f.misses > 0 ? <><TownIcon name={"pineBranch" as IconName} size={16} /><span className="font-data tabular-nums text-[#ffb09c]">×{f.misses}</span></> : <TownIcon name="check" size={14} />}
                </span>
              ))}
            </p>
          )}
          {rootId !== null && (
            <button type="button" onClick={() => void root()} data-trees-root data-left={powerLeft(purse, "axRoot", now)}
                    className="pressable mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border-[3px] border-[#2a190d] bg-[#8fd45f] px-3 text-ui font-semibold text-[#1c3a0d] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]">
              <TownIcon name={"pineTree" as IconName} size={22} />{th ? "ให้ตอนี้โตคืนทันที" : "Grow this stump back now"}
              <span className="rounded-full bg-black/15 px-2 py-px font-data text-meta tabular-nums">{powerLeft(purse, "axRoot", now)}</span>
            </button>
          )}
        </section>
      )}
      {working ? (
        <div key={`${working.id}:${working.ask.trees[0]?.seed ?? 0}`} className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game="felling" data-tree={working.id}>
          <TownFelling th={th} ask={working.ask} elder={working.elder} look={look} reduced={reduced} sfx={sfx} powers={powers}
                       onDone={(out, how) => void done(working, out, how)} onCancel={() => setWorking(null)} />
        </div>
      ) : here && !card && (
        <div className="pointer-events-none mb-14 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => void begin(here.id)} data-trees-offer={here.id} data-state="open"
                  className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-accent py-1 pl-2 pr-5 text-read font-semibold text-bg shadow-xl shadow-black/40">
            <span className="grid size-10 place-items-center rounded-full bg-bg/25"><TownIcon name={"axe" as IconName} size={28} /></span>
            {here.elder ? (th ? "โค่นต้นไม้เก่าแก่" : "Fell the ancient tree") : th ? "ตัดต้นไม้" : "Fell the tree"}
            <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
