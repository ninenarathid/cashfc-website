"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nearOf, type FellOutcome, type FellingAsk, type Girth } from "@/lib/town/felling";
import { works } from "@/lib/town/gifts";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import type { FellDid, Keeper } from "@/lib/town/keeper";
import type { Look } from "@/lib/town/look";
import type { TreeAge } from "@/lib/town/mountain";
import { powerLeft } from "@/lib/town/powers";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { ALL, GEM_FX, gemBy, has } from "@/lib/town/tools";
import { held } from "@/lib/town/trade";
import { KEEPSAKES, TREES, WOOD, axeOf, bearsOf, bites, farFrom, fellWord, fellingOf, girthOf, lookOf, readFellWord, wantsOf, type FellOne, type KeepsakeId, type Standing, type TreesTold } from "@/lib/town/trees";
import { walkable, type Vec } from "@/lib/town/world";
import { registerTap, setAncientLook, setTreeLooks, setTreeScales } from "./mountain-art";
import type { FarmDraw } from "./TownFarm";
import TownFelling, { GIRTH_NAME } from "./TownFelling";
import { useLeaving } from "./useLeaving";
import TownFoot from "./TownFoot";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import TownPinesBook, { keepsakeIcon } from "./TownPinesBook";
import { WHY } from "./TownTrade";
import { Vfx } from "./vfx";

/** What a tree that is not felled says of itself, by the state that refused it (states, never the rule behind them). */
const WHY_TREE: Record<string, [th: string, en: string]> = {
  stump: ["ยังไม่โต", "Not grown yet"], bite: ["ขวานนี้ฟันไม่เข้า", "This axe will not bite"], plus: ["ต้นไม้เก่าแก่ไม่สะเทือนเลย", "The ancient tree does not so much as tremble"],
  far: ["ยืนไกลเกินไป", "Too far to reach"], tool: ["ต้องถือขวาน", "It takes an axe in the hand"], spent: ["วันนี้ใช้ไปหมดแล้ว", "None left today"],
  // (one go on a tree at a time: somebody else's board is up at it)
  held: ["มีคนกำลังโค่นต้นนี้อยู่", "Somebody is felling this tree"],
  // (the ancient tree alone stands when its go is lost)
  dropped: ["ขวานหลุดมือ ต้นไม้เก่าแก่ยังยืนอยู่", "The axe slipped: the ancient tree stands"], time: ["ไม่ทัน ต้นไม้เก่าแก่ยังยืนอยู่", "Out of time: the ancient tree stands"],
  left: ["วางขวานแล้ว ต้นไม้เก่าแก่ยังยืนอยู่", "Axe put down: the ancient tree stands"],
};
/** How long the card of what a go gave stays up, in milliseconds; and a small word of what the plain way gave. */
const CARD_MS = 12_000, GOT_MS = 2600;
/** How far from its member a woodpecker goes to a grown tree, in tiles. */
const PERCH = 7;
/** A pine is drawn as stout as it is: how large a grown one stands against its picture's own size, slender, plain and stout. */
const GIRTH_SCALE = [0.86, 1, 1.16];
/** The numerals a better axe's tier is written in. */
const TIER = ["", "I", "II", "III", "IV"];
const iconFor = (item: ItemId): IconName => { const name = iconOf(item); return (name in ICON_ATLAS.icons ? name : "log") as IconName; };
const TIMBER = iconFor("timber");
/** So many minutes, or hours and minutes, as a few letters over a stump. */
const leftOf = (ms: number, th: boolean): string => {
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  if (mins < 60) return th ? `${mins} นาที` : `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return th ? `${h} ชม. ${m} นาที` : `${h} h ${m} min`;
};
/** The first, second, third, in a few letters. */
const NTH: ReadonlyArray<[th: string, en: string]> = [["ชิ้นแรก", "a first"], ["ชิ้นที่ 2", "a second"], ["ชิ้นที่ 3", "a third"]];

interface Working { id: number; trees: number[]; ask: FellingAsk; elder: boolean; from: [number, number] }
/** What a go came to, on a card: what whoever keeps the game said of it, how the board went (none, of the axe's one chop and of the plain way), and the tile I stood on. */
interface Card { did: FellDid; out: FellOutcome | null; ask: FellingAsk | null; tile: string; at: number }
/** Somebody else who does something at a tree, as the room has them: where they stand (their tile), and their letters (lib/town/room's `fell`). */
export interface TreeFolk { id: string; name: string; x: number; y: number; moving: boolean; fell: string }
/** A few words over the buttons: a refusal (with the axe a tree wants, where it wants one), or what the plain way gave. */
interface Note { text: string; wants?: { tier: number; plus: number }; got?: Array<[ItemId, number]> }

/** The axe a tree asks for, as a picture: of a better tier (an axe nobody has yet: a shade, with its tier on it), or this one forged so far. */
function Wanted({ wants }: { wants: { tier: number; plus: number } }) {
  const shade = wants.plus === 0;
  return (
    <span className="relative grid size-11 shrink-0 place-items-center rounded-md border-2 border-[#2a190d] bg-[#4a2f18]" data-trees-wants={shade ? `tier${wants.tier}` : `plus${wants.plus}`}>
      <span className={shade ? "opacity-80 brightness-0" : "drop-shadow-[0_0_5px_#ffd98a]"}><TownIcon name={"axe" as IconName} size={30} /></span>
      <span className="absolute -bottom-1.5 -right-1.5 rounded-full border-2 border-[#2a190d] bg-[#f0c060] px-1 font-data text-label font-semibold leading-tight text-[#3a2209]">{shade ? TIER[wants.tier] ?? wants.tier : `+${wants.plus}`}</span>
    </span>
  );
}
/** The fine timber of a tree, a pip each: lit, for those that were won (or may be). */
function Pips({ most, got, size = 16 }: { most: number; got: number; size?: number }) {
  return (
    <span className="flex gap-0.5" data-pips={`${got}/${most}`}>
      {Array.from({ length: most }, (_, j) => <span key={j} className={j < got ? "" : "opacity-35 grayscale"}><TownIcon name={TIMBER} size={size} /></span>)}
    </span>
  );
}

/**
 * The mountain's trees, to fell (the owner, 2026-10-08: woodcutting). The rules are lib/town/trees'; the game is
 * lib/town/felling's, on its own board (components/town/TownFelling). The trees themselves are drawn by the map's
 * own module for these maps (components/town/mountain-art), from what this tells it: each tree's look, as whoever
 * keeps the game says who felled which and when.
 *
 * With an axe in the hand a tap on a tree walks up to it. Beside a grown one there are two presses: the plain one
 * fells it at once for its logs, and the other puts the board up, which is played for the fine timber (the tree
 * comes down however that goes). A tree this axe cannot fell shows the axe it wants. What a go gave comes up on a
 * small card, with how near it was to more. A pine's girth is in the tree itself: the map's drawing is told how
 * large each grown one stands (`setTreeScales`). Over the map this draws only what is somebody's own to see: how long
 * a stump has to go for whoever has a woodpecker, a glint on the grown trees for an axe that sees them, the tree the
 * presses are for, and the mark of a tree half cut.
 *
 * A friend may brace the trunk: whoever stands within two tiles of a tree somebody's board is up at has one press
 * for it. Who has a board up where, and who braces which trunk, is told through the room in a few letters with the
 * rest of what one does (lib/town/room's `fell`); whoever keeps the game writes the brace down and pays it.
 */
export default function TownTrees({ keeper, th, name, tile, near, look, reduced, sfx, busy, walk, register, registerPerch, tell, others }: {
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
  /** Something else has the screen: nothing is offered. */
  busy: boolean;
  /** Walk me to a tile. */
  walk: (x: number, y: number) => boolean;
  register: (draw: FarmDraw | null) => void;
  /** Hand the map the way to say where a woodpecker flies to from where its member stands (and take it back with null). */
  registerPerch: (perch: ((at: Vec) => Vec | null) | null) => void;
  /** Tell the room what I do at a tree: "f" and its number while my board is up at it, "b" and its number while I brace its trunk, "" when neither. */
  tell: (word: string) => void;
  /** The others who do something at a tree, as this screen has them. */
  others: () => TreeFolk[];
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
  const leaving = useLeaving(keeper);
  const [card, setCard] = useState<Card | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  /** The tree I tapped: the one the two presses are for, while I stand beside it. */
  const [picked, setPicked] = useState<number | null>(null);
  /** The book of the pines, open (at a leaf, or at its first), or shut. */
  const [book, setBook] = useState<{ at: KeepsakeId | null } | null>(null);
  useEffect(() => { if (!near || working) setBook(null); }, [near, working]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), GOT_MS); return () => clearTimeout(t); }, [note]);
  useEffect(() => { if (!card) return; const t = setTimeout(() => setCard(null), CARD_MS); return () => clearTimeout(t); }, [card]);
  const vfx = useMemo(() => new Vfx(), []);
  /** A refusal, said as its state; of a tree that wants another axe, with that axe's picture. */
  const say = useCallback((why: string, tree?: number) => {
    const w = WHY_TREE[why] ?? WHY[why as keyof typeof WHY], t = tree === undefined ? null : WOOD.find((x) => x.id === tree);
    const wants = t && (why === "bite" || why === "plus") ? wantsOf(t) : null;
    setNote(w ? { text: th ? w[0] : w[1], ...(wants ? { wants } : {}) } : null);
  }, [th]);

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
  // A pine's girth is seen in the tree itself, by everybody: the map is told how large each grown pine stands, once,
  // where whoever keeps the game keeps trees (the girth is from the tree's number: it never changes).
  const kept = !!told;
  useEffect(() => {
    if (!kept) return;
    setTreeScales(WOOD.filter((t) => !t.elder && t.tier === 1).map((t) => [t.id, GIRTH_SCALE[girthOf(t) - 1] ?? 1] as const));
    return () => setTreeScales([]);
  }, [kept]);

  /* ── walking up to a tree ── */
  const want = useRef<number | null>(null), tileRef = useRef(tile), axeRef = useRef(axe), busyRef = useRef(busy || !!working);
  tileRef.current = tile; axeRef.current = axe; busyRef.current = busy || !!working;
  const beginning = useRef(false);
  /** The board is put up for a tree: the go is mine from now. */
  const begin = useCallback(async (id: number) => {
    const from = tileRef.current;
    if (!from || beginning.current || busyRef.current) return;
    beginning.current = true;
    try {
      const did = await keeper.fellBegin(id, from);
      if (!did.ok) { say(did.why, id); return; }
      setCard(null);
      setNote(null);
      setWorking({ id, trees: did.trees, ask: did.ask, elder: did.elder, from });
    } finally { beginning.current = false; }
  }, [keeper, say]);
  /** What a tree that came down leaves on the map for a moment. */
  const fall = useCallback((felled: readonly FellOne[]) => {
    sfx?.wake();
    sfx?.work("pick");
    for (const f of felled) {
      const t = WOOD.find((x) => x.id === f.id);
      if (!t) continue;
      const mid = (t.size ?? 1) / 2, where = { x: t.x + mid, y: t.y + mid };
      vfx.add("leaves", where);
      vfx.add("dust", where);
      if (f.got[0]) vfx.add("pop", where, { icon: f.got[0][0], lift: 20 });
      if (f.keepsake) vfx.add("sparkle", where);
    }
  }, [sfx, vfx]);
  /** The plain way: the tree is felled at once, for its logs. No board, and no fine timber. */
  const plain = useCallback(async (id: number) => {
    const from = tileRef.current;
    if (!from || beginning.current || busyRef.current) return;
    beginning.current = true;
    try {
      const did = await keeper.fellDo({ tree: id, secs: 0, plain: true }, from, name);
      if (!did.ok) { say(did.why, id); return; }
      sfx?.wake(); sfx?.work("timber");
      fall(did.felled);
      // (a keepsake is told on a card; wood alone, in a word over the buttons)
      if (did.found.length) setCard({ did, out: null, ask: null, tile: from.join(","), at: Date.now() });
      else { setCard(null); setNote({ text: th ? "ล้มแล้ว" : "Timber", got: did.got }); }
    } finally { beginning.current = false; }
  }, [keeper, name, say, sfx, fall, th]);
  /** A tap on a tree: with an axe in the hand it is walked up to, and the two presses are for it; with none it is a step, as anywhere. */
  const tapped = useCallback((id: number): boolean => {
    const t = WOOD.find((x) => x.id === id);
    // (where whoever keeps the game keeps no trees, a tree is only a tree: the tap is a step)
    if (!t || !axeRef.current || busyRef.current || !toldRef.current) return false;
    const from = tileRef.current;
    if (from && farFrom(t, from) <= TREES.reach) { setPicked(id); return true; }
    // the nearest tile beside it that can be stood on
    const size = t.size ?? 1, me = from ?? [t.x, t.y + size], beside: Array<[number, number]> = [];
    for (let y = t.y - 1; y <= t.y + size; y++) for (let x = t.x - 1; x <= t.x + size; x++) {
      if ((x < t.x || x >= t.x + size || y < t.y || y >= t.y + size) && walkable(x, y)) beside.push([x, y]);
    }
    beside.sort((a, b) => Math.hypot(a[0] - me[0], a[1] - me[1]) - Math.hypot(b[0] - me[0], b[1] - me[1]));
    for (const [x, y] of beside) if (walk(x, y)) { want.current = id; return true; }
    return false;
  }, [walk]);
  useEffect(() => {
    const stops = [registerTap("tree", (tap) => tapped(tap.id)), registerTap("ancient", () => tapped(TREES.elder.id))];
    return () => { for (const stop of stops) stop(); };
  }, [tapped]);
  // come to a stand beside the tree that was tapped: the presses are for it; come to a stand anywhere else: it is forgotten
  const spot = tile ? tile.join(",") : "";
  useEffect(() => {
    const at = tileRef.current;
    if (!at) return;
    const id = want.current;
    want.current = null;
    const t = id === null ? null : WOOD.find((x) => x.id === id);
    setPicked(t && farFrom(t, at) <= TREES.reach ? t.id : null);
  }, [spot]);

  // The grown tree I stand beside, if I hold an axe: the one I tapped; else the nearest that this axe fells (the
  // ancient tree before a pine), and where it fells none of them, the nearest.
  const beside: Standing[] = near && tile && axe && !busy && !working && told ? WOOD.filter((t) => farFrom(t, tile) <= TREES.reach && lookOf(told, t.id, now) === 3) : [];
  const here: Standing | null = beside.find((t) => t.id === picked)
    ?? [...beside].sort((a, b) => Number(!!bites(axe!, a)) - Number(!!bites(axe!, b)) || Number(!!b.elder) - Number(!!a.elder) || Math.hypot(a.x - tile![0], a.y - tile![1]) - Math.hypot(b.x - tile![0], b.y - tile![1]))[0] ?? null;
  const hereId = here?.id ?? -1, hereRef = useRef(-1);
  hereRef.current = hereId;
  /** Why the axe in my hand cannot fell the tree I stand beside, where it cannot. */
  const refused = here && axe ? bites(axe, here) : null;
  // walking off leaves the board (a go that was begun is over then, and its tree comes down for its logs: the board sees to it)
  useEffect(() => {
    if (!working) return;
    const t = WOOD.find((x) => x.id === working.id);
    if (!tile || !t || farFrom(t, tile) > TREES.reach) setWorking(null);
  }, [working, tile]);
  // and walking off puts the card away
  useEffect(() => { setCard((c) => (c && c.tile !== spot ? null : c)); }, [spot]);

  /* ── a friend at the trunk ── */
  // The others at a tree, by their tiles: looked at a few times a second while I am on the mountain.
  const [folk, setFolk] = useState<TreeFolk[]>([]);
  useEffect(() => {
    if (!near) { setFolk([]); return; }
    let was = "";
    const read = () => {
      const all = others().map((o) => ({ ...o, x: Math.floor(o.x), y: Math.floor(o.y) })), key = JSON.stringify(all);
      if (key !== was) { was = key; setFolk(all); }
    };
    read();
    const t = setInterval(read, 400);
    return () => clearInterval(t);
  }, [near, others]);
  /** The trunk I brace: whose go it is, at which tree, and the logs I had when I took hold. */
  const [bracing, setBracing] = useState<{ feller: string; name: string; tree: number; logs: number } | null>(null);
  // What I do at a tree is told to the room: my board up, a trunk braced, or neither.
  const word = working ? fellWord(working.trees.length ? working.trees : [working.id]) : bracing ? `b${bracing.tree}` : "";
  useEffect(() => { tell(word); }, [word, tell]);
  useEffect(() => () => tell(""), [tell]);
  /**
   * Whoever else is felling the tree I stand by: their board is up at it, or it is one of the trees their go holds
   * (the room says so: lib/town/trees' fellWord). One go on a tree at a time: it is not offered to me meanwhile, and
   * says whose it is; bracing their trunk stays offered.
   */
  const holder = here && !working ? folk.find((o) => { const w = readFellWord(o.fell); return w?.kind === "f" && w.trees.includes(here.id); }) ?? null : null;
  /** Whoever braces the trunk of my go: somebody who says so, standing within a brace's reach of the tree. */
  const bracer = working ? folk.find((o) => { const t = WOOD.find((x) => x.id === working.id); return o.fell === `b${working.id}` && !!t && farFrom(t, [o.x, o.y]) <= TREES.brace.reach; }) ?? null : null;
  /** A go I may brace: somebody's board is up at a tree within a brace's reach of where I stand, and nobody braces it yet. */
  const open = near && tile && !busy && !working && !bracing
    ? folk.filter((o) => o.fell[0] === "f").map((o) => ({ o, t: WOOD.find((x) => x.id === readFellWord(o.fell)?.tree) ?? null }))
      .find(({ t }) => !!t && farFrom(t, tile) <= TREES.brace.reach && !folk.some((b) => b.fell === `b${t.id}`)) ?? null
    : null;
  const braceIt = useCallback(async (feller: TreeFolk) => {
    const from = tileRef.current;
    if (!from || beginning.current) return;
    beginning.current = true;
    try {
      const did = await keeper.fellBrace(feller.id, from);
      if (!did.ok) { say(did.why); return; }
      sfx?.wake(); sfx?.work("pluck");
      setBracing({ feller: feller.id, name: feller.name, tree: did.tree, logs: held(keeper.purse().bag, "log") });
    } finally { beginning.current = false; }
  }, [keeper, say, sfx]);
  // I hold the trunk while their board is up and I stand by it. Their go over, what I had for it is said a moment on.
  useEffect(() => {
    if (!bracing) return;
    const t = WOOD.find((x) => x.id === bracing.tree), on = folk.some((o) => { const w = o.id === bracing.feller ? readFellWord(o.fell) : null; return w?.kind === "f" && w.tree === bracing.tree; });
    if (on && tile && t && farFrom(t, tile) <= TREES.brace.reach) return;
    setBracing(null);
    if (on) return;
    const had = bracing.logs;
    window.setTimeout(() => {
      const n = held(keeper.purse().bag, "log") - had;
      if (n > 0) setNote({ text: th ? "ช่วยค้ำต้นไม้" : "Braced the trunk", got: [["log", n]] });
    }, 1500);
  }, [bracing, folk, tile, keeper, th]);

  /** The board is shut by its member before its first chop: written down as left in a moment, unless its own end comes first (lib/town/leaving). */
  const cancel = useCallback((w: Working) => {
    setWorking(null);
    const at = keeper.now(), first = WOOD.find((t) => t.id === w.id);
    leaving.left(w, { game: "felling", board: "felling", how: "left", at, won: false, secs: 0, spent: isSpent(keeper.purse(), at), buff: null, what: first?.elder ? TREES.elderKind : TREES.kinds[(first?.tier ?? 1) - 1], need: 0, hits: 0, misses: 0 });
  }, [keeper, leaving]);

  /** A go is over: it is written down, judged by whoever keeps the game, and what it gave comes up on a card. */
  const done = useCallback(async (w: Working, out: FellOutcome, how: { one?: boolean; twice?: boolean }) => {
    setWorking(null);
    leaving.ended(w);
    const mine = keeper.purse(), at = keeper.now(), first = WOOD.find((t) => t.id === w.id);
    if (!how.one) {
      // (a go played out with no fine timber is done, not dropped: the board came to its end)
      keeper.record({ game: "felling", board: "felling", ...(out.through ? {} : { how: "done" as const }), at, won: out.through, secs: out.secs, spent: isSpent(mine, at), buff: null,
        what: first?.elder ? TREES.elderKind : TREES.kinds[(first?.tier ?? 1) - 1], need: out.chops, hits: out.cut, misses: out.misses });
    }
    const did = await keeper.fellDo({ tree: w.id, through: out.through, misses: out.misses, secs: out.secs, ...(how.one ? { one: true } : {}), ...(how.twice ? { twice: true } : {}) }, w.from, name);
    if (!did.ok) { say(did.why, w.id); return; }
    // (the ancient tree, of a go that was lost)
    if (did.stood) { say(out.end && out.end !== "through" ? out.end : "time"); return; }
    fall(did.felled);
    setNote(null);
    setCard({ did, out: how.one ? null : out, ask: how.one ? null : w.ask, tile: w.from.join(","), at: Date.now() });
  }, [keeper, name, say, fall, leaving]);

  /** The quickening root: the last stump I made grows back at once. */
  const rootId = card && axe && powerLeft(purse, "axRoot", now) > 0 && has(axe, "axRoot") ? [...card.did.felled].reverse().find((f) => f.id !== TREES.elder.id)?.id ?? null : null;
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
  const eye = useRef({ pecker: false, glint: 0, th, knows: false, axe: false });
  eye.current = { pecker: works(purse, "famWoodpecker"), glint: axe ? gemBy(axe, "light", GEM_FX.light.axe.glint) : 0, th, knows: !!axe && has(axe, "axElder"), axe: !!axe };
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
      // the tree the presses are for, marked from above, for whoever holds an axe. (A pine's girth is in the tree
      // itself: the map draws each grown one as stout as it is, `setTreeScales`; the marks at its foot are gone.)
      if (e.axe && self && said) {
        const tr = WOOD.find((x) => x.id === hereRef.current);
        if (tr && !tr.elder && tr.tier <= TREES.axeTier && lookOf(said, tr.id, at) === 3) {
          const c = project({ x: tr.x + 0.5, y: tr.y + 0.62 });
          if (onScreen(c)) {
            const tall = tr.tier === 1 ? GIRTH_SCALE[girthOf(tr) - 1] ?? 1 : 1;
            const bob = still ? 0 : Math.round(Math.sin(t / 260) * 2 * s), d = Math.max(2, Math.round(2 * s)), x = Math.round(c.x), y = Math.round(c.y - 74 * tall * s) + bob;
            (over ?? ((fn: () => void) => fn()))(() => {
              // (an arrow of big pixels, pointing down at the tree)
              for (let r = 0; r < 4; r++) {
                ctx.fillStyle = "#2a190d";
                ctx.fillRect(x - (4 - r) * d - d, y + r * d, (2 * (4 - r) + 1) * d + d, d + 1);
                ctx.fillStyle = "#f0c060";
                ctx.fillRect(x - (3 - r) * d - Math.floor(d / 2), y + r * d, (2 * (3 - r) + 1) * d, d);
              }
            });
          }
        }
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

  // The space bar puts the board up (while the board is up it is the board's).
  useEffect(() => {
    if (!here || working || refused || book || holder) return;
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
  }, [hereId, working, refused, book, begin, holder]);

  // (for scripts in `next dev`)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      /** What I am told of the trees, and how each that is not grown looks now. */
      told: () => toldRef.current, looks: () => Object.fromEntries(looks()),
      /** Every tree of the layout, with its tile and its girth. */
      wood: () => WOOD.map((t) => ({ ...t, girth: girthOf(t) })),
      /** The tree the presses are for where I stand; a tap on a tree, as the map hands one over; the board put up at one; and the plain way. */
      here: () => hereId, tap: (id: number) => tapped(id), begin: (id: number) => begin(id), plain: (id: number) => plain(id),
      working: () => (working ? { id: working.id, trees: working.trees, elder: working.elder, ask: working.ask } : null),
      card: () => (card ? { ...card.did, out: card.out } : null),
      /** The book of the pines: open it (at a leaf), shut it, and whether it is open. */
      book: (at?: KeepsakeId | null) => setBook(at === undefined ? null : { at }), bookOpen: () => !!book,
      note: () => note, root: () => root(), rootable: () => rootId,
      /** A friend at the trunk: the others at a tree, the go I may brace, the press, the trunk I hold, and who braces mine. */
      folk: () => folk, open: () => (open?.t ? { feller: open.o.id, tree: open.t.id } : null), brace: () => (open ? braceIt(open.o) : undefined), bracing: () => bracing, bracer: () => bracer?.id ?? null,
      /** What this page draws for me alone: glints on grown trees and times over stumps, as of the last frame. */
      glints: () => glinting.current, times: () => timed.current,
    };
    (window as unknown as { __townTrees?: typeof handle }).__townTrees = handle;
    return () => { delete (window as unknown as { __townTrees?: typeof handle }).__townTrees; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the go I may brace is known by who and where
  }, [hereId, tapped, begin, plain, working, card, note, root, rootId, looks, folk, open?.o.id, open?.t?.id, braceIt, bracing, bracer?.id, book]);

  const nameOf = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const powers = axe ? { one: has(axe, "axOne") ? powerLeft(purse, "axOne", now) : 0, twice: has(axe, "axDouble") ? powerLeft(purse, "axDouble", now) : 0 } : undefined;
  if (!working && !here && !note && !card && !open && !bracing && !book) return null;
  const hereGirth: Girth | null = here && !here.elder ? girthOf(here) : null;
  /** How near the go was to more, in a few words: a state, of the tree walked up to. */
  const nearWord = (c: Card): string | null => {
    const out = c.out, first = c.did.felled[0];
    if (!out || !first || first.kind === TREES.elderKind) return null;
    const t = WOOD.find((x) => x.id === first.id), near = nearOf(out, t ? bearsOf(t) : []);
    if (!out.through) {
      const how = out.end === "dropped" ? (th ? "ขวานหลุดมือ" : "The axe slipped") : out.end === "left" ? (th ? "วางขวาน" : "Axe put down") : th ? "แถบหมด" : "Out of time";
      return th ? `${how}ตอนเหลืออีก ${near.chops} ฟัน` : `${how} ${near.chops} ${near.chops === 1 ? "chop" : "chops"} from the end`;
    }
    if (!near.misses) return th ? "ได้ไม้เนื้อดีครบทุกชิ้น" : "Every fine timber it had";
    const nth = NTH[Math.min(NTH.length - 1, near.got)];
    return th ? `พลาดน้อยกว่านี้ ${near.misses} ครั้ง ก็ได้ไม้เนื้อดี${nth[0]}` : `${near.misses === 1 ? "One miss" : `${near.misses} misses`} from ${nth[1]} fine timber`;
  };
  // (placed by the foot's grid, components/town/TownFoot: the board, or the book, has the foot while it is up; what
  // the tree stood by is for is lowest otherwise. Nothing here keeps a distance of its own.)
  return (
    <TownFoot rank={working || book ? "board" : "main"} order={61}>
      {note && (
        <p className="pop-in flex items-center gap-2 rounded-full bg-bg/85 py-1.5 pl-2 pr-4 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-trees-note aria-live="polite">
          {note.wants && <Wanted wants={note.wants} />}
          <span className="pl-2">{note.text}</span>
          {note.got?.map(([id, n]) => <span key={id} className="flex items-center gap-1" data-trees-got={id} data-n={n}><TownIcon name={iconFor(id)} size={22} /><span className="font-data tabular-nums">×{n}</span></span>)}
        </p>
      )}
      {/* a friend's go near me: one press braces its trunk; and the trunk I hold */}
      {open?.t && (
        <button type="button" onClick={() => void braceIt(open.o)} data-trees-brace={open.t.id} data-feller={open.o.id} data-state="open"
                className="pop-in pressable pointer-events-auto flex min-h-12 max-w-full items-center gap-2 rounded-full bg-[#24465c] py-1 pl-2 pr-4 text-ui font-semibold text-[#dff3ff] shadow-xl shadow-black/40">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15"><TownIcon name={"handshake" as IconName} size={26} /></span>
          <span className="truncate">{th ? `ช่วยค้ำต้นไม้ให้ ${open.o.name}` : `Brace the trunk for ${open.o.name}`}</span>
        </button>
      )}
      {bracing && (
        <p className="pop-in flex max-w-full items-center gap-2 rounded-full bg-[#24465c]/95 py-1.5 pl-2 pr-4 text-ui text-[#dff3ff] shadow-lg shadow-black/30" data-state="open" data-trees-bracing={bracing.tree} aria-live="polite">
          <TownIcon name={"handshake" as IconName} size={22} /><span className="truncate">{th ? `กำลังค้ำต้นไม้ให้ ${bracing.name}` : `Bracing the trunk for ${bracing.name}`}</span>
        </p>
      )}
      {/* the book of the pines: what the village has found of what a pine lets fall */}
      {book && !working && (
        <TownPinesBook key={book.at ?? ""} th={th} book={told?.book ?? []} mine={fellingOf(purse).keeps} first={book.at} onClose={() => setBook(null)} />
      )}
      {/* what the go gave: a small card of the town's wood */}
      {card && !working && !book && (
        <section aria-label={th ? "ได้ไม้" : "Wood brought home"} data-trees-card data-state="open" data-through={card.out ? String(card.out.through) : undefined}
                 className="pop-in pointer-events-auto w-[20rem] max-w-full rounded-lg border-[3px] border-[#2a190d] bg-[#6b4424] px-3 pb-2.5 pt-2 shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-title font-semibold text-[#ffeccb] [text-shadow:0_2px_0_#2a190d]">{th ? (card.did.felled.length > 1 ? `ล้ม ${card.did.felled.length} ต้น` : "ล้มแล้ว") : card.did.felled.length > 1 ? `${card.did.felled.length} trees felled` : "Timber"}</h2>
            <button type="button" onClick={() => setCard(null)} className="pressable -mr-1 ml-auto rounded-md px-2.5 py-1.5 text-meta text-[#e9cfa4] hover:text-[#fff6e3]">{th ? "ปิด" : "Close"}</button>
          </div>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {card.did.got.map(([id, n]) => (
              <li key={id} data-trees-got={id} data-n={n} className="flex items-center gap-1.5 rounded-[4px] border-2 border-[#2a190d] bg-[#4a2f18] py-1 pl-1.5 pr-2 text-ui text-[#ffeccb]">
                <TownIcon name={iconFor(id)} size={26} />{nameOf(id)}<span className="font-data tabular-nums text-[#ffe19a]">×{n}</span>
              </li>
            ))}
          </ul>
          {/* each tree of the go: its fine timber, won and not; and how near the go was to more */}
          {card.out && (
            <div className="mt-1.5 flex flex-col gap-1 text-label text-[#e9cfa4]">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {card.did.felled.map((f) => (
                  <span key={f.id} className="flex items-center gap-1" data-trees-felled={f.id} data-misses={f.misses} data-timber={f.timber}>
                    <TownIcon name={"treeStump" as IconName} size={18} />
                    {f.kind === TREES.elderKind ? <TownIcon name="check" size={14} /> : <Pips most={f.most} got={Math.min(f.most, f.twice ? f.timber / 2 : f.timber)} />}
                  </span>
                ))}
                {card.out.misses > 0 && <span className="flex items-center gap-1" data-trees-misses={card.out.misses}><TownIcon name={"pineBranch" as IconName} size={16} /><span className="font-data tabular-nums text-[#ffb09c]">×{card.out.misses}</span></span>}
              </p>
              {nearWord(card) && <p className="text-meta text-[#ffeccb]" data-trees-near>{nearWord(card)}</p>}
              {card.did.braced && <p data-trees-braced>{th ? "มีเพื่อนช่วยค้ำต้นไม้ให้" : "A friend braced the trunk"}</p>}
            </div>
          )}
          {/* what the tree let fall besides: a keepsake, kept in the book of the pines and never in the bag */}
          {card.did.found.map((k) => (
            <button key={k.id} type="button" onClick={() => setBook({ at: k.id })} data-trees-keepsake={k.id} data-first={k.first ? "" : undefined}
                    className="pressable mt-1.5 flex w-full items-start gap-2 rounded-[4px] border-2 border-[#2a190d] bg-[#3a2513] px-2 py-1.5 text-left text-label text-[#e9cfa4]">
              <span className="mt-0.5 shrink-0"><TownIcon name={keepsakeIcon(k.id)} size={32} /></span>
              <span className="flex min-w-0 flex-col">
                <span className="text-ui font-semibold text-[#ffeccb]">{th ? KEEPSAKES[k.id].name.th : KEEPSAKES[k.id].name.en}{k.first && <span className="ml-1.5 rounded-full bg-[#f0c060] px-1.5 py-px text-label font-semibold text-[#3a2209]">{th ? "คนแรกของหมู่บ้าน" : "The village's first"}</span>}</span>
                <span>{th ? KEEPSAKES[k.id].line.th : KEEPSAKES[k.id].line.en}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[#ffe19a]"><TownIcon name={"wellBook" as IconName} size={14} />{th ? "เก็บเข้าสมุดป่าสนแล้ว" : "Kept in the book of the pines"}</span>
              </span>
            </button>
          ))}
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
        <div key={`${working.id}:${working.ask.seed}`} className="pop-in pointer-events-auto w-full max-w-[24rem]" data-state="open" data-game="felling" data-tree={working.id}>
          <TownFelling th={th} ask={working.ask} elder={working.elder} look={look} reduced={reduced} sfx={sfx} powers={powers} braced={bracer?.name ?? null}
                       onDone={(out, how) => void done(working, out, how)} onCancel={() => cancel(working)} />
        </div>
      ) : here && !card && !book && (
        <div className="pointer-events-none flex flex-col items-center gap-1.5" data-trees-here={here.id} data-girth={hereGirth ?? undefined}>
          {/* what stands here: the pine's girth, with the fine timber it has at the most; and the book of the pines */}
          {hereGirth && !refused && (
            <div className="flex items-center gap-1.5">
              <p className="pop-in flex items-center gap-1.5 rounded-full bg-bg/85 py-1 pl-2 pr-3 text-meta text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open">
                <TownIcon name={"pineTree" as IconName} size={20} />{th ? GIRTH_NAME[hereGirth - 1][0] : GIRTH_NAME[hereGirth - 1][1]}
                <Pips most={bearsOf(here).length} got={bearsOf(here).length} />
              </p>
              <button type="button" onClick={() => setBook({ at: null })} data-trees-book data-state="open" aria-label={th ? "สมุดป่าสน" : "The book of the pines"} title={th ? "สมุดป่าสน" : "The book of the pines"}
                      className="pop-in pressable pointer-events-auto grid size-11 place-items-center rounded-full bg-bg/85 shadow-lg shadow-black/30 backdrop-blur-sm">
                <TownIcon name={"wellBook" as IconName} size={24} />
              </button>
            </div>
          )}
          {holder ? (
            // one go on a tree at a time: somebody else's board is up at it (their trunk may be braced: the chip beside)
            <p className="pop-in flex items-center gap-2 rounded-full bg-bg/85 py-1.5 pl-2 pr-4 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-trees-held={holder.id}>
              <span className="grid size-8 place-items-center rounded-full bg-ink/10"><TownIcon name={"axe" as IconName} size={20} /></span>
              {th ? `${holder.name} กำลังโค่นต้นนี้อยู่` : `${holder.name} is felling this tree`}
            </p>
          ) : refused ? (
            // a tree this axe cannot fell: the axe it wants, as a picture
            <p className="pop-in flex items-center gap-3 rounded-full bg-bg/85 py-1.5 pl-2 pr-4 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" data-trees-refused={refused}>
              {wantsOf(here) && <Wanted wants={wantsOf(here)!} />}
              {th ? WHY_TREE[refused][0] : WHY_TREE[refused][1]}
            </p>
          ) : (
            <div className="flex flex-wrap items-stretch justify-center gap-2">
              {/* the plain way: down at once, for its logs */}
              {!here.elder && (
                <button type="button" onClick={() => void plain(here.id)} data-trees-plain={here.id} data-state="open"
                        className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-bg/90 py-1 pl-2 pr-4 text-ui font-semibold text-ink shadow-xl shadow-black/40 backdrop-blur-sm">
                  <span className="grid size-10 place-items-center rounded-full bg-ink/10"><TownIcon name={"log" as IconName} size={26} /></span>
                  <span className="flex flex-col items-start leading-tight"><span>{th ? "ตัดเลย" : "Fell it now"}</span><span className="text-label font-normal opacity-80">{th ? `ได้ท่อนไม้ ${TREES.logs}` : `${TREES.logs} logs`}</span></span>
                </button>
              )}
              {/* the board: played for the fine timber */}
              <button type="button" onClick={() => void begin(here.id)} data-trees-offer={here.id} data-state="open"
                      className="pop-in pressable pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-accent py-1 pl-2 pr-4 text-ui font-semibold text-bg shadow-xl shadow-black/40">
                <span className="grid size-10 place-items-center rounded-full bg-bg/25"><TownIcon name={"axe" as IconName} size={28} /></span>
                <span className="flex flex-col items-start leading-tight">
                  <span>{here.elder ? (th ? "โค่นต้นไม้เก่าแก่" : "Fell the ancient tree") : th ? "ลงมือโค่น" : "Chop it down"}</span>
                  {!here.elder && <span className="text-label font-normal opacity-90">{th ? "ลุ้นไม้เนื้อดี" : "for fine timber"}</span>}
                </span>
                <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>
              </button>
            </div>
          )}
        </div>
      )}
    </TownFoot>
  );
}
