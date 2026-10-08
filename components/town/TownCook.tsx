"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COOKING, ODD, harderCook, hasMade, isFind, madeOf, mayTake, potNow, reachOf, stirMods, stirsFor, type CookHow, type Pot } from "@/lib/town/cooking";
import { USES, hasThing, usesLeft, works } from "@/lib/town/gifts";
import { BOWL, DISHES, ITEMS, potIconOf, type DishId, type ItemId } from "@/lib/town/items";
import { TASTE_WORD, keepNote, readNotes, type Note } from "@/lib/town/kitchen";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { buffBy, hasBuff, isSpent, mayEat } from "@/lib/town/stamina";
import { cookFx, stirsWith } from "@/lib/town/forged";
import { handOf, held, heldStack } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import { KITCHEN, TILE_H, onYard } from "@/lib/town/world";
import { YARD } from "@/lib/town/yard";
import type { FarmDraw } from "./TownFarm";
import { ICON_ATLAS, type IconName } from "./TownIcon";
import type { GameResult } from "./TownGame";
import { AT_THE_POT, BURST, BuffAura } from "./TownBuffFx";
import TownFeast, { clockOf } from "./TownFeast";
import TownKitchen, { type KitchenResult, type Whisper } from "./TownKitchen";
import TownRoasting from "./TownRoasting";
import TownStirring from "./TownStirring";
import { WHY } from "./TownTrade";
import { Vfx } from "./vfx";

/** Where I stand still: my tile, and what of the cooking yard I am at there. */
/** Where somebody stands still: the tile, and what of a cooking place it is (one of the yard's, or `camp`: beside the forest camp's fire, where things are cooked and put together by hand alike). */
export interface Standing { tile: [number, number]; place: "stove" | "table" | "fire" | "wash" | "camp" | null }

/** Why not, in the kitchen's own words (the rest are the trade's). */
const WHY_COOK: Record<string, [string, string]> = {
  tool: ["ของในมือทำสิ่งนี้ไม่ได้", "What you hold will not make this"], none: ["ของในกระเป๋าไม่พอ", "Not enough of that in your bag"],
  amount: ["ยังไม่ได้ใส่อะไร", "Nothing is in yet"],
  // (the whispering spoon's: lib/town/cooking's spoon)
  astray: ["ช้อนเงียบ ไม่มีสูตรไหนใช้ของแบบนี้", "The spoon is silent: no recipe has this"], known: ["ช้อนเงียบ สูตรของหม้อนี้รู้ครบแล้ว", "The spoon is silent: you know all of this pot's recipes"],
  spent: ["ตอนนี้ใช้ครบแล้ว", "No more of it for now"],
  // (the phoenix flame's stove: where nobody can stand still to cook)
  nostove: ["ตรงนี้ตั้งเตาไม่ได้ ลองยืนนิ่งๆ ที่อื่น", "No stove can be set here: stand still somewhere else"],
  // (the hearth sprite's: lib/town/cooking's cookWith)
  unmade: ["ภูตทำได้แต่สูตรที่เราเคยทำเอง", "The sprite cooks only what you have made yourself"],
  bowl:["ไม่มีถ้วยว่าง", "No bowl to spare"],
  // (the feast table's, lib/town/cooking: a pot that was eaten up or cleared away meanwhile; as many of one's own as the ground or the table takes)
  gone: ["หม้อนี้ไม่อยู่แล้ว", "That pot is gone"],
  manyGround: [`วางบนพื้นได้ทีละ ${COOKING.pots} หม้อ เก็บหม้อเก่าก่อน หรือเอาไปวางที่โต๊ะเลี้ยงในลานทำอาหาร`, `${COOKING.pots} pots on the ground at a time: take one up first, or set it on the feast table in the cooking yard`],
  manyTable: [`โต๊ะเลี้ยงรับได้คนละ ${COOKING.feast.pots} หม้อ เก็บหม้อเก่าก่อน`, `The feast table takes ${COOKING.feast.pots} pots each: take one of yours back first`],
};
/** Where the kitchen's notebook is kept, a member: what was tried and what came of it (lib/town/kitchen). */
const NOTES_KEY = "cashtown.kitchen.notes";
type Offer = "cook" | "down" | "ladle" | "take" | "water" | "feast";
const VERB: Record<Offer, [string, string]> = {
  cook: ["ทำอาหาร", "Cook"], down: ["วางหม้อ", "Set the pot down"], ladle: ["ตักใส่ถ้วย", "Ladle a helping"], take: ["เก็บหม้อ", "Take the pot"],
  water: ["เทน้ำใส่โอ่ง", "Pour it into the jar"], feast: ["โต๊ะเลี้ยง", "The feast table"],
};
/** Where the yard's water jar stands, for the few words over it: the middle of the tiles beside it. */
const JAR_AT = KITCHEN.wash.length
  ? { x: KITCHEN.wash.reduce((t, [x]) => t + x + 0.5, 0) / KITCHEN.wash.length, y: KITCHEN.wash.reduce((t, [, y]) => t + y + 0.5, 0) / KITCHEN.wash.length }
  : null;

/**
 * The cooking yard, to cook in (the owner, 2026-10-03: "ช่วยทำให้ ลานทำอาหารเสร็จเลย
 * ช่วยลองเทสด้วยว่า การทำอาหาร … พร้อมที่จะเล่นได้จริง"). The rules are lib/town/cooking's.
 *
 * - At a stove, a worktable or the fire, the kitchen table is laid
 *   (components/town/TownKitchen; the owner, 2026-10-06: "rework UI การทำอาหารให้
 *   เข้าใจง่ายขึ้น เปิดสูตรที่มีดูคู่กันไปได้"): the cookware is taken up there from
 *   what the bag has (or bare hands, offered at every place), things from the bag
 *   are picked one by one and put together (never by recipe: "ทำอาหาร ต้องเลือก
 *   วัตถุดิบเอง ไม่ใช่เลือกเป้นสูตร"), stirred (the game of timing), and become a
 *   pot of a dish, or something else that is made, or an odd dish, or
 *   nothing: a card says which, and from it a helping is ladled and eaten at
 *   once, or the pot set down. The others standing at the yard's places with
 *   cookware in their hands are the rest of the cooks. Every try is written
 *   in a notebook, in the browser.
 * - A pot of food held in the hand is set down where one stands; anybody
 *   beside it with a bowl ladles a helping, and the bowl goes with the helping
 *   until it is eaten; its owner takes it up again while there is food in it;
 *   its last helping out, it is gone.
 *
 * - By the yard's water jar, with a bucket that has water in it: the bucket
 *   is poured in (lib/town/yard). A pot cooked while the jar has water takes
 *   a bucketful and has a helping more: nothing says so but the pot itself,
 *   and the jar, which is a bucketful the less.
 *
 * - **The feast table** (lib/town/cooking; the owner, 2026-10-07): a dish set
 *   down in the yard is on the yard's two dining tables, drawn on their tops,
 *   and whoever stands on the yard's floor is offered the table
 *   (components/town/TownFeast): to eat a helping there out of the table's own
 *   bowl, to ladle one into a bowl of their own, to set a pot of theirs on it
 *   or take one back. A pot on the ground stands there an hour and is then on
 *   the table; the odd dish is gone with its hour. Setting one down says until
 *   when it stands there.
 *
 * Nothing says what makes what. It also draws the pots that stand about, and
 * how much water the jar has.
 * What is kept is the keeper's (lib/town/keeper): the database's for a member,
 * the browser's trial in `next dev`'s test room.
 */
export default function TownCook({ me, keeper, called, th, here, crew, cooks: others, sfx, bottom, register, onOpen, art, reduced = false, onEatNow, onFeastEat, feastAsk = 0, yard = null, phone = false, tabbar = false }: {
  /** A picture out of the town's scenery, by its name: the scene a roast is played on (the forest's own sheet has it). */
  art?: (name: string) => Sprite | null;
  me: string;
  keeper: Keeper;
  /** What I am called, for the name beside a recipe I am the first to find. */
  called: string;
  th: boolean;
  /** Where I stand still (null while walking, or while something else is open). */
  here: Standing | null;
  /** What the others standing at the yard's places hold in their hands, and who they are (the database reads each one's hand itself). */
  crew: string[];
  cooks: string[];
  sfx: FishSfx | null;
  bottom: string;
  /** Hand the map the way to draw the pots (and take it back with null). */
  register: (draw: FarmDraw | null) => void;
  /** Told when the cooking panel opens or closes, so that the map can close what would lie under it. */
  onOpen?: (open: boolean) => void;
  /** Whether nothing is to move (the map's own switch, not the browser's). */
  reduced?: boolean;
  /** A helping of this dish is in my bag, to be eaten now: the map finds me somewhere to sit and the meal begins there. */
  onEatNow?: (dish: DishId) => void;
  /** A helping of a pot on the feast table is to be eaten out of the table's own bowl: the map finds me a place at the tables, and asks the keeper for it once I am sat. */
  onFeastEat?: (dish: DishId, pot: string) => void;
  /** Goes up each time a dining table's top was tapped and I stand in the yard: the feast table's panel opens. */
  feastAsk?: number;
  /** The tile I am on while I am still on the cooking yard's floor, standing or sitting, and nothing else is open: from where the feast table is reached. */
  yard?: [number, number] | null;
  phone?: boolean;
  tabbar?: boolean;
}) {
  const [, setTick] = useState(0);
  const purse = keeper.purse(), now = keeper.now(), hand = handOf(purse);
  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    const stop = keeper.watch(again), t = setInterval(again, 5000);
    return () => { stop(); clearInterval(t); };
  }, [keeper]);
  // The pots that stand about and what has been found are everybody's: kept in sight while I am in town.
  useEffect(() => keeper.look("kitchen"), [keeper]);
  const [note, setNote] = useState<string | null>(null);
  /** The same words while they are a refusal: the kitchen table says those itself (what came of a go is on its card). */
  const [refusal, setRefusal] = useState<string | null>(null);
  useEffect(() => { if (!note) { setRefusal(null); return; } const t = setTimeout(() => setNote(null), 5200); return () => clearTimeout(t); }, [note]);
  const name = useCallback((id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en), [th]);
  /** What is in the air over the yard: steam, smoke, bubbles, a sparkle (the owner, 2026-10-03: "การทำอาหาร … ช่วยใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลาเลย"). */
  const vfx = useMemo(() => new Vfx(), []);
  const say = useCallback((why: string) => { const w = WHY_COOK[why] ?? WHY[why as keyof typeof WHY], words = w ? (th ? w[0] : w[1]) : null; setNote(words); setRefusal(words); }, [th]);

  // The pots that stand about, drawn among everything else on the map.
  const pots = keeper.pots(), potsRef = useRef<Pot[]>(pots);
  potsRef.current = pots;
  /** The feast table, where whoever keeps the game has one; and what is on it. */
  const feast = keeper.feast(), served = useMemo(() => pots.filter((o) => o.feast), [pots]);
  /** The bucketfuls in the yard's jar: null where whoever keeps the game knows of no jar. */
  const jar = keeper.yardJar(), jarRef = useRef<number | null>(jar);
  jarRef.current = jar;
  useEffect(() => {
    register((frame) => {
      const { ctx, things, project, onScreen, sign, s, now: t, img, still, th: thai, indoors } = frame;
      vfx.draw(frame);
      if (!img?.complete || !img.naturalWidth) return;
      /** A picture stood at a point, so many of the map's pixels wide whatever its own size (the pots' sheets were drawn at several). */
      const blit = (icon: string, x: number, y: number, wide: number) => {
        const cell = ICON_ATLAS.icons[icon as IconName];
        if (!cell) return;
        const [sx, sy, w, h] = cell, k = wide / w;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, sx, sy, w, h, Math.round(x - wide / 2), Math.round(y - h * k), wide, h * k);
      };
      // what is on the feast table: a pot at each place of the two tops, as many as there are places, and a few words
      // over each table; from outside, under the roof, the same words over the house's doorway
      const onTable = potsRef.current.filter((o) => o.feast);
      if (onTable.length) {
        const dishes = new Set(onTable.map((o) => o.dish)).size;
        const words = thai ? `โต๊ะเลี้ยง · ${dishes} อย่าง` : `Feast table · ${dishes} dish${dishes === 1 ? "" : "es"}`;
        if (indoors) {
          onTable.slice(0, KITCHEN.feast.served.length).forEach((pot, i) => {
            const place = KITCHEN.feast.served[i], at = project(place.at);
            if (!onScreen(at)) return;
            things.push({ depth: KITCHEN.foot.x + KITCHEN.foot.y + KITCHEN.tops[place.table][1] / (TILE_H / 2) + 0.04, draw: () =>
              blit(potIconOf(pot.dish), at.x, at.y + (still ? 0 : Math.sin(t / 520 + i) * 0.5 * s), 24 * s) });
          });
          KITCHEN.feast.over.forEach((over, table) => {
            const at = project(over);
            if (onScreen(at) && (table === 0 || onTable.length > 1)) sign(words, at.x, at.y - 30 * s);
          });
        } else {
          const at = project(KITCHEN.feast.door);
          if (onScreen(at)) sign(words, at.x, at.y);
        }
      }
      for (const pot of potsRef.current) {
        if (pot.feast) continue;
        // (a pot in the cooking yard is under its roof for whoever is outside)
        if (!indoors && onYard(pot.at[0], pot.at[1])) continue;
        // a little before whoever stands on its tile
        const at = project({ x: pot.at[0] + 0.8, y: pot.at[1] + 0.8 });
        if (!onScreen(at)) continue;
        things.push({ depth: pot.at[0] + pot.at[1] + 1.65, draw: () => {
          if (pot.tok) blit("tok", at.x, at.y + 6 * s, 34 * s);
          // the dish's own pot, breathing a little; emptied, a scraped pot
          blit(pot.left > 0 ? potIconOf(pot.dish) : "potEmpty", at.x, at.y - (pot.tok ? 7 * s : 0) + (still || pot.left < 1 ? 0 : Math.sin(t / 520 + pot.at[0]) * 0.6 * s), 30 * s);
        } });
        if (pot.left > 0) sign(`${thai ? ITEMS[pot.dish].name.th : ITEMS[pot.dish].name.en} ×${pot.left}`, at.x, at.y - 44 * s);
      }
      // the phoenix flame's stove, set where I stand: the bottle on the ground beside me (clear of my name), and its glow (on my own screen)
      const lit = stoveRef.current;
      if (lit) {
        const at = project({ x: lit[0] + 1.35, y: lit[1] + 0.3 });
        if (onScreen(at)) things.push({ depth: lit[0] + lit[1] + 1.66, draw: () => {
          ctx.save();
          ctx.globalAlpha = still ? 0.34 : 0.3 + 0.12 * Math.sin(t / 170);
          ctx.fillStyle = "#ffb347";
          ctx.beginPath();
          ctx.ellipse(at.x, at.y - 10 * s, 19 * s, 12 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          blit("thingFlame", at.x, at.y + (still ? 0 : Math.sin(t / 240) * 0.7 * s), 18 * s);
        } });
      }
      // how much water the yard's jar has, over it (under the roof, for whoever is outside)
      if (indoors && JAR_AT && jarRef.current !== null) {
        const at = project(JAR_AT);
        if (onScreen(at)) sign(`${thai ? "โอ่งน้ำ" : "Water jar"} ${jarRef.current}/${YARD.holds}`, at.x, at.y - 58 * s);
      }
    });
    return () => register(null);
  }, [register, vfx]);

  /* ── what there is to do where I stand ── */
  const near = useMemo(() => {
    if (!here) return null;
    let best: Pot | null = null, far = Infinity;
    for (const pot of pots) {
      // (what is on the feast table is the table's panel's, from anywhere in the yard)
      if (pot.feast) continue;
      const d = Math.hypot(pot.at[0] - here.tile[0], pot.at[1] - here.tile[1]);
      if (d <= reachOf(pot) && d < far) { best = pot; far = d; }
    }
    return best;
  }, [here, pots]);
  const atYard = here?.place === "stove" || here?.place === "table" || here?.place === "fire" || here?.place === "camp";
  /** Whether I am on the cooking yard's floor, standing or sitting: from where the feast table is reached, and where a dish set down goes onto it. */
  const inYard = !!yard;
  // The phoenix flame in a bottle (lib/town/gifts): a stove wherever its owner stands still, on any map. It is set from
  // the bag's panel (a word sent to this page, since the bag knows nothing of the kitchen), stays while I stand there,
  // and is gone when I walk off. Nothing that keeps the game asks where a cook stands: this is the page's own.
  const flameHad = hasThing(purse, "thingFlame"), flameLeft = flameHad ? usesLeft(purse, "thingFlame", now) : 0;
  /** The tile its stove is set on: a stove only while I stand on that tile. */
  const [stoveAt, setStoveAt] = useState<[number, number] | null>(null);
  const stove = !!stoveAt && !!here && !atYard && here.tile[0] === stoveAt[0] && here.tile[1] === stoveAt[1];
  const [stoveAsked, setStoveAsked] = useState(0);
  const stoveRef = useRef<[number, number] | null>(null);
  stoveRef.current = stove ? stoveAt : null;
  useEffect(() => { if (stoveAt && !stove) setStoveAt(null); }, [stoveAt, stove]);
  useEffect(() => {
    const ask = () => setStoveAsked(Date.now());
    window.addEventListener("cashtown:stove", ask);
    return () => window.removeEventListener("cashtown:stove", ask);
  }, []);
  const atPlace = atYard || (stove && flameHad && !!here);
  const offers: Offer[] = [];
  if (here) {
    // (the cookware is taken up at the table itself: whoever stands at a place is offered it)
    if (atPlace) offers.push("cook");
    if (hand === "potFull") offers.push("down");
    if (near && near.left > 0) offers.push("ladle");
    if (near && mayTake(near, me)) offers.push("take");
    // (by the water jar, with a bucket that has water in it)
    if (here.place === "wash" && keeper.yardCanPour()) offers.push("water");
  }
  // (on the yard's floor, sitting too: the feast table, while there is anything on it or a pot of mine to set there)
  if (feast && inYard && (served.length > 0 || purse.bag.some((s) => s?.item === "potFull" && s.of?.dish !== ODD))) offers.push("feast");

  /* ── cooking ── */
  const [open, setOpen] = useState(false);
  const [things, setThings] = useState<Array<[ItemId, number]>>([]);
  const [stirring, setStirring] = useState<{ things: Array<[ItemId, number]>; crew: Array<ItemId | null> } | null>(null);
  /** What came of the last go, while its card is up. */
  const [result, setResult] = useState<KitchenResult | null>(null);
  /** The notebook: every try and what came of it, kept in this browser. */
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => { try { setNotes(readNotes(JSON.parse(window.localStorage.getItem(`${NOTES_KEY}.${me}`) ?? "[]"))); } catch { setNotes([]); } }, [me]);
  const jot = useCallback((note: Note) => setNotes((was) => {
    const next = keepNote(was, note);
    try { window.localStorage.setItem(`${NOTES_KEY}.${me}`, JSON.stringify(next)); } catch { /* a browser that keeps nothing: the notebook lasts as long as the page */ }
    return next;
  }), [me]);
  const cooks = useMemo((): Array<ItemId | null> => [hand, ...crew.map((c) => (c in ITEMS ? (c as ItemId) : null))], [hand, crew]);
  // (the stove asked for: set as soon as I stand somewhere, which is at once when the bag's panel is put away; after a
  // little while with nowhere to stand still, it is said so and the asking is dropped)
  useEffect(() => {
    if (!stoveAsked || !flameHad) return;
    if (here) {
      setStoveAsked(0);
      if (!atYard) setStoveAt(here.tile);
      setResult(null);
      setOpen(true);
      sfx?.wake(); sfx?.work("crackle", 0.7);
      return;
    }
    const t = setTimeout(() => { setStoveAsked(0); say("nostove"); }, 2500);
    return () => clearTimeout(t);
  }, [stoveAsked, flameHad, here, atYard, say, sfx]);
  /** Whether the flame is set to give back what comes to nothing, for the pots I cook (mine to turn off for a guess not worth one of the day's three). */
  const [flameOn, setFlameOn] = useState(true);
  // walking off, or the place going, shuts it
  useEffect(() => { if (!atPlace) { setOpen(false); setStirring(null); setResult(null); } }, [atPlace]);
  useEffect(() => { onOpen?.(open); }, [open, onOpen]);
  const count = (id: ItemId) => things.find(([t]) => t === id)?.[1] ?? 0;
  const add = (id: ItemId) => {
    sfx?.wake(); sfx?.work("pick", 0.5);
    setThings((was) => {
      const have = was.find(([t]) => t === id);
      if ((have?.[1] ?? 0) >= held(purse.bag, id) || (!have && was.length >= COOKING.kinds)) return was;
      return have ? was.map(([t, n]): [ItemId, number] => (t === id ? [t, n + 1] : [t, n])) : [...was, [id, 1]];
    });
  };
  const drop = (id: ItemId) => setThings((was) => was.flatMap(([t, n]): Array<[ItemId, number]> => (t !== id ? [[t, n]] : n > 1 ? [[t, n - 1]] : [])));
  /* ── the whispering spoon (lib/town/cooking): asked of what is in the pot; what it tells is mine alone ── */
  const [whisper, setWhisper] = useState<Whisper | null>(null);
  const [asking, setAsking] = useState(false);
  useEffect(() => { setWhisper(null); }, [things, open]);
  const askSpoon = useCallback(async () => {
    if (asking) return;
    setAsking(true);
    try {
      const did = await keeper.spoonAsk(things);
      if (!did.ok) { say(did.why); return; }
      sfx?.wake(); sfx?.work("made", 0.5);
      setRefusal(null);
      setWhisper({ of: did.of, secret: did.secret, ways: did.ways });
    } finally { setAsking(false); }
  }, [asking, keeper, things, say, sfx]);
  /** Take up the cookware in a slot of the bag, or put away what is held (the table's own choosing of it). */
  const takeUp = useCallback(async (slot: number | null) => {
    const did = await keeper.hold(slot);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake(); sfx?.work("down", 0.6);
  }, [keeper, say, sfx]);
  const go = useCallback(() => {
    const why = keeper.cookTry(things, cooks);
    if (why) { say(why); return; }
    setStirring({ things, crew: cooks });
  }, [keeper, things, cooks, say]);
  /** What a go came to, however it was cooked (`how`: by hand, with the game's account; by the hearth sprite, with none): told, written down, shown. */
  const cooked = useCallback(async (job: { things: Array<[ItemId, number]>; crew: Array<ItemId | null> }, result: GameResult, how: CookHow = {}) => {
    const before = keeper.purse().bag;
    const did = await keeper.cookDo(job.things, job.crew, others, { hits: result.hits, misses: result.misses, secs: result.secs, need: result.need, ...(how.sprite ? { sprite: true } : {}), ...(how.flame ? { flame: true } : {}) }, called);
    if (!did.ok) { say(did.why); return; }
    // (the pot that came of it stands in a slot that had no pot before: the card's helping and its setting down are of that one, whatever other pots the bag has)
    const slot = did.made ? keeper.purse().bag.findIndex((s, i) => s?.item === "potFull" && s.of?.dish === did.made && before[i]?.item !== "potFull") : -1;
    // (a recipe's dish is a go won; the odd dish, and nothing, are not)
    const right = isFind(did.made);
    keeper.record({ game: "cooking", at: keeper.now(), won: right, secs: result.secs, spent: isSpent(purse, now), buff: null, what: did.made ?? "nothing", need: result.need, hits: result.hits, misses: result.misses });
    setThings([]);
    setRefusal(null);
    jot({ at: keeper.now(), things: job.things, tool: job.crew[0], cooks: job.crew.length, made: did.made, n: did.n + (did.fresh ? YARD.gives : 0), ...(did.taste ? { taste: did.taste } : {}), ...(did.first ? { first: true } : {}) });
    setResult({ made: did.made, n: did.n + (did.fresh ? YARD.gives : 0), first: did.first, ...(slot >= 0 ? { slot } : {}), ...(did.taste ? { taste: did.taste, things: job.things, crew: job.crew } : {}), ...(did.sprite ? { sprite: true } : {}), ...(did.back ? { back: true } : {}) });
    // what comes off the pot, and what it sounds like: a dish, something made, an odd dish, or nothing
    const odd = !right && !!did.made, cooked = right && did.made! in DISHES;
    sfx?.wake();
    sfx?.work(cooked ? "cooked" : right ? "made" : odd ? "odd" : did.back ? "crackle" : "nothing");
    vfx.add(right || did.back ? "sparkle" : odd ? "smoke" : "dust", null, { lift: 20 });
    // (the phoenix flame gave every thing back: the bottle held up where the pot would have been)
    if (did.back) vfx.add("pop", null, { icon: "thingFlame", lift: 24 });
    if (cooked) vfx.add("steam", null, { lift: 22 });
    // (the fountain's big pot gave a helping more: its own burst over the pot)
    if ((cooked || odd) && hasBuff(purse, now, "feast")) vfx.add("bless", null, { icon: BURST.feast, lift: 30 });
    if (did.made) vfx.add("pop", null, { icon: did.made, lift: 24 });
    // (the pot took a bucketful of the yard's jar: water over it, and a helping more than the stirring made)
    if (did.fresh) vfx.add("water", null, { lift: 26 });
    const helpings = did.n + (did.fresh ? YARD.gives : 0);
    // (what is no recipe's is tasted: how near it was to something)
    const taste = did.taste ? ` · ${th ? TASTE_WORD[did.taste].th : TASTE_WORD[did.taste].en}` : "";
    if (!did.made) { setNote(`${did.back ? (th ? "เปลวฟีนิกซ์คืนของให้ครบ" : "The phoenix flame gave everything back") : th ? "ไม่ได้อะไรเลย" : "Nothing came of it"}${taste}`); return; }
    const dish = did.made in DISHES;
    setNote(`${did.first ? (th ? "พบสูตรใหม่! " : "A new recipe! ") : ""}${name(did.made)} ${dish ? (th ? `· ${helpings} ที่` : `· ${helpings} helpings`) : `×${did.n}`}${taste}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse and the clock are read when the dish is done
  }, [keeper, others, th, sfx, name, say, called, vfx, jot]);
  const finish = useCallback((result: GameResult) => {
    const job = stirring;
    setStirring(null);
    // (cooked by hand with the flame set to guard the pot: what comes to nothing comes back, while it has any of the day's left)
    if (job) void cooked(job, result, flameHad && flameOn && flameLeft > 0 ? { flame: true } : {});
  }, [stirring, cooked, flameHad, flameOn, flameLeft]);

  /* ── the hearth sprite (lib/town/cooking's cookWith): while it follows me, a recipe I have made is cooked with no game ── */
  const spriteOn = works(purse, "famSprite"), spriteLeft = spriteOn ? usesLeft(purse, "famSprite", now) : 0;
  const [spriting, setSpriting] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // (its to cook: what is in the pot is a recipe I have made, and nothing else would refuse it: the cooks, the cookware, the bag's room)
  const spriteMay = useMemo(() => {
    if (!spriteOn || !things.length) return false;
    const made = madeOf(things);
    return !!made && hasMade(purse, made) && keeper.cookTry(things, cooks) === null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse is read anew when the keeper says so
  }, [spriteOn, things, cooks, keeper, purse]);
  const goSprite = useCallback(() => {
    if (spriting || !spriteMay || spriteLeft < 1) return;
    const job = { things, crew: cooks };
    setSpriting(true);
    sfx?.wake(); sfx?.work("crackle");
    // (and over the stove on the map, where I stand)
    vfx.add("sparkle", null, { lift: 26 });
    vfx.add("pop", null, { icon: "famSprite", lift: 30 });
    setTimeout(() => {
      if (!alive.current) return;
      void cooked(job, { hits: 0, misses: 0, secs: 0, need: 0 }, { sprite: true }).finally(() => { if (alive.current) setSpriting(false); });
    }, reduced ? 200 : 1500);
  }, [spriting, spriteMay, spriteLeft, things, cooks, sfx, vfx, cooked, reduced]);

  /* ── the feast table (lib/town/cooking) ── */
  /** What is said of a pot just set down: where it is, and until when (nothing, where whoever keeps the game has no feast table: it stands until it is empty). */
  const stood = useCallback((pot: Pot) => {
    const is = feast ? potNow(pot, keeper.now(), feast.ground) : null;
    if (!is || !Number.isFinite(is.until)) return null;
    const till = clockOf(is.until);
    return is.feast ? (th ? `วางบนโต๊ะเลี้ยงแล้ว อยู่ถึง ${till} น.` : `On the feast table until ${till}`)
      : pot.dish === ODD ? (th ? `วางไว้ตรงนี้ถึง ${till} น. แล้วจะถูกเก็บทิ้ง` : `It stands here until ${till}, and is then cleared away`)
      : (th ? `วางไว้ตรงนี้ถึง ${till} น. แล้วจะย้ายไปโต๊ะเลี้ยงในลานทำอาหาร` : `It stands here until ${till}, and is then on the feast table in the cooking yard`);
  }, [feast, keeper, th]);
  /** Why a pot was not set down, in the words for where it would have gone: as many of one's own as the ground or the table takes. */
  const whyDown = useCallback((why: string, dish: DishId | undefined) => (why === "many" && feast ? (inYard && dish !== ODD ? "manyTable" : "manyGround") : why), [feast, inYard]);
  const [feastOpen, setFeastOpen] = useState(false);
  const [feastSaid, setFeastSaid] = useState<string | null>(null);
  const [feastBusy, setFeastBusy] = useState(false);
  // (walking off the yard's floor, or anything else opening over the map, puts the table's panel away)
  useEffect(() => { if (!inYard) setFeastOpen(false); }, [inYard]);
  /** The table's panel, opened: with a few words in it (a pot just set there says until when it stands), or none. */
  const showFeast = useCallback((said: string | null = null) => { setFeastSaid(said); setFeastOpen(true); }, []);
  // (a dining table's top was tapped on the map: it opens where I stand in the yard and whoever keeps the game has a table)
  const mayFeast = useRef(false);
  mayFeast.current = !!feast && inYard;
  useEffect(() => { if (feastAsk > 0 && mayFeast.current) showFeast(); }, [feastAsk, showFeast]);
  const wordsOf = useCallback((why: string) => { const w = WHY_COOK[why] ?? WHY[why as keyof typeof WHY]; return w ? (th ? w[0] : w[1]) : why; }, [th]);
  /** At the table's panel: a helping into a bowl of mine, a pot of mine taken back, or the pot in a slot of my bag set on the table. */
  const feastDo = useCallback(async (what: "ladle" | "take" | "set", pot: Pot | null, slot = -1) => {
    if (!yard || feastBusy) return;
    setFeastBusy(true);
    const set = what === "set" ? await keeper.potDown(yard, slot) : null;
    const did = set ?? (what === "ladle" ? await keeper.potLadle(pot!.id, yard) : await keeper.potTake(pot!.id, yard));
    setFeastBusy(false);
    if (!did.ok) { setFeastSaid(wordsOf(what === "ladle" && did.why === "tool" ? "bowl" : what === "set" && did.why === "many" ? "manyTable" : did.why)); return; }
    sfx?.wake();
    sfx?.work(what === "ladle" ? "ladle" : "down");
    setFeastSaid(what === "ladle" ? (th ? `ตัก${name(pot!.dish)}ใส่ถ้วยแล้ว` : `A helping of ${name(pot!.dish).toLowerCase()} is in your bowl`)
      : what === "take" ? (th ? "เก็บหม้อคืนเข้ากระเป๋าแล้ว" : "The pot is back in your bag")
      : (set?.ok ? stood(set.pot) : null) ?? (th ? "วางบนโต๊ะแล้ว" : "Set on the table"));
  }, [yard, feastBusy, keeper, wordsOf, sfx, th, name, stood]);
  /** A helping of a pot on the table, out of the table's own bowl: the map finds me a place to sit, and the keeper is asked once I am sat. */
  const feastEat = useCallback((pot: Pot) => { setFeastOpen(false); sfx?.wake(); onFeastEat?.(pot.dish, pot.id); }, [onFeastEat, sfx]);
  // (what the keeper refused once I was sat: the map asked it, and says so here)
  useEffect(() => {
    const said = (e: Event) => { const why = String((e as CustomEvent<string>).detail ?? "gone"); say(why === "none" ? "gone" : why); };
    window.addEventListener("cashtown:feast-refused", said);
    return () => window.removeEventListener("cashtown:feast-refused", said);
  }, [say]);

  /* ── from the card of what came of it ── */
  /** Where the pot just cooked is in the bag: the slot it was put in while it is still there, or else the first pot of its dish (-1: none). */
  const cookedPot = useCallback(() => {
    const bag = keeper.purse().bag, is = (i: number) => bag[i]?.item === "potFull" && bag[i]?.of?.dish === result?.made;
    if (!result?.made) return -1;
    return result.slot !== undefined && is(result.slot) ? result.slot : bag.findIndex((_, i) => is(i));
  }, [keeper, result]);
  /** A helping of the pot just cooked, into a bowl, and off to eat it: the map finds somewhere to sit. */
  const eatNow = useCallback(async () => {
    const slot = cookedPot();
    if (slot < 0) { say("none"); return; }
    const did = await keeper.serve(slot);
    if (!did.ok) { say(did.why === "tool" ? "bowl" : did.why); return; }
    sfx?.wake(); sfx?.work("ladle");
    setResult(null);
    setOpen(false);
    onEatNow?.(did.dish);
  }, [cookedPot, keeper, say, sfx, onEatNow]);
  /** The pot just cooked, set down where I stand, for whoever comes with a bowl: that pot, and no other the bag has. */
  const potDown = useCallback(async () => {
    if (!here) return;
    const slot = cookedPot();
    if (slot < 0) { say("none"); return; }
    const did = await keeper.potDown(here.tile, slot);
    if (!did.ok) { say(whyDown(did.why, keeper.purse().bag[slot]?.of?.dish)); return; }
    sfx?.wake(); sfx?.work("down");
    vfx.add("dust", null, { lift: 2 });
    setResult(null);
    setOpen(false);
    // (on the table: its panel opens with the pot on it, which is where it is eaten from; on the ground: a few words)
    const words = stood(did.pot);
    if (did.pot.feast && feast) showFeast(words);
    else if (words) setNote(words);
  }, [here, cookedPot, keeper, say, sfx, vfx, whyDown, stood, feast, showFeast]);
  /** The pot just cooked thrown away, as the bag throws a thing away: it lies where I stand ten seconds, and is gone (offered for the odd dish, which the feast table does not take). */
  const pour = useCallback(async () => {
    if (!here) return;
    const slot = cookedPot();
    if (slot < 0) { say("none"); return; }
    const did = await keeper.groundDrop(slot, here.tile);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake(); sfx?.work("down");
    vfx.add("dust", null, { lift: 2 });
    setResult(null);
    setOpen(false);
  }, [here, cookedPot, keeper, say, sfx, vfx]);

  /* ── pots ── */
  /** The pot of food in my hand: of several in the bag, the one that was taken up (the keeper's handSlot), which is the one set down. */
  const heldSlot = hand === "potFull" ? keeper.handSlot() : -1, heldPot = heldSlot < 0 ? null : purse.bag[heldSlot]?.of ?? null;
  const act = useCallback(async (offer: Offer) => {
    if (offer === "cook") { setResult(null); setOpen(true); return; }
    if (offer === "feast") { showFeast(); return; }
    if (offer === "water") {
      const poured = await keeper.yardPour(here?.tile ?? null);
      if (!poured.ok) { say(poured.why); return; }
      sfx?.wake();
      sfx?.work("pour");
      vfx.add("splash", JAR_AT, { lift: 30 });
      setNote(`${th ? "โอ่งน้ำ" : "Water jar"} ${keeper.yardJar() ?? 0}/${YARD.holds}`);
      return;
    }
    const down = offer === "down" && here ? await keeper.potDown(here.tile, heldSlot < 0 ? undefined : heldSlot) : null;
    const did = offer === "down" ? down
      : offer === "ladle" ? (near ? await keeper.potLadle(near.id, here?.tile ?? null) : null) : (near ? await keeper.potTake(near.id, here?.tile ?? null) : null);
    if (!did) return;
    if (!did.ok) { say(offer === "ladle" && did.why === "tool" ? "bowl" : offer === "down" ? whyDown(did.why, heldPot?.dish) : did.why); return; }
    sfx?.wake();
    sfx?.work(offer === "ladle" ? "ladle" : "down");
    if (offer === "ladle" && near) vfx.add("steam", { x: near.at[0] + 0.8, y: near.at[1] + 0.8 }, { lift: 16 });
    else vfx.add("dust", null, { lift: 2 });
    if (offer === "ladle" && near) setNote(`${name(near.dish)} ×1`);
    // (a pot set down says where it is and until when)
    const words = down?.ok ? stood(down.pot) : null;
    if (down?.ok && down.pot.feast && feast) showFeast(words);
    else if (words) setNote(words);
  }, [keeper, here, near, heldSlot, heldPot, sfx, name, say, vfx, whyDown, stood, feast, showFeast]);

  // The space bar is the first thing on offer (while a game or the cooking panel is up it is theirs).
  const first = offers[0];
  useEffect(() => {
    if (open || stirring || feastOpen || !first) return;
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
      if ((e.key !== " " && e.code !== "Space") || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      act(first);
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [open, stirring, feastOpen, first, act]);

  // (for scripts in `next dev`)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = {
      offers: () => offers, act, pots: () => keeper.pots(), crew: () => cooks, open: () => open, things: () => things,
      put: (list: Array<[ItemId, number]>) => setThings(list), go, found: () => keeper.found(),
      // (the kitchen table: what came of the last go while its card is up, the card's ways on, the notebook)
      result: () => result, again: () => setResult(null), eatNow, potDown, notes: () => notes, tool: takeUp, shut: () => { setResult(null); setOpen(false); },
      places: () => KITCHEN.places, floor: () => KITCHEN.floor, note: () => note,
      wash: () => KITCHEN.wash, jar: () => keeper.yardJar(),
      // (the feast table: whether whoever keeps the game has one, what is on it, its panel, and its deeds)
      feast: () => ({ told: feast, pots: served, open: feastOpen, said: feastSaid, inYard }), feastShow: (on: boolean) => (on ? showFeast() : setFeastOpen(false)), feastDo, feastEat, pour,
      // (the kitchen's gifts)
      spoon: askSpoon, whisper: () => whisper, sprite: goSprite, spriteMay: () => spriteMay, spriting: () => spriting,
      stove: () => window.dispatchEvent(new CustomEvent("cashtown:stove")), stoveSet: () => stove, flame: (on: boolean) => setFlameOn(on), flameOn: () => flameOn,
    };
    (window as unknown as { __townCook?: typeof handle }).__townCook = handle;
    return () => { delete (window as unknown as { __townCook?: typeof handle }).__townCook; };
  });

  const spent = isSpent(purse, now);
  // (the better I am at the kitchen's line, the harder its good dishes are to cook: lib/town/cooking's harderCook. Nothing says so but the game.)
  const harder = stirring ? harderCook(madeOf(stirring.things), keeper.lines()?.lines.kitchen.points ?? 0) : 1;
  // ── forging: old tools ── (what the cookware in my hand carries of its own, as the stirring reads it: lib/town/forged. Plain cookware: nothing.)
  const cfx = cookFx(heldStack(purse, keeper.handSlot()));
  const table = open && !stirring && atPlace;
  if (!open && !stirring && !feastOpen && !offers.length && !note) return null;
  return (
    <>
    {table && (
      <TownKitchen th={th} reduced={reduced} place={atYard ? (here!.place as "stove" | "table" | "fire" | "camp") : "flame"} keeper={keeper} purse={purse} now={now} crew={cooks} things={things} notes={notes}
                   result={result} why={refusal} bottom={bottom} fire={art?.("gameFire") ?? null}
                   eat={{ bowl: held(purse.bag, BOWL) > 0, meal: mayEat(purse, now, keeper.helpings()) }}
                   onAdd={add} onDrop={drop} onClear={() => setThings([])} onTool={takeUp} onGo={go} onClose={() => { setResult(null); setOpen(false); }}
                   onAgain={() => setResult(null)} onEat={eatNow} onPotDown={potDown} feast={!!feast && inYard} onPour={keeper.ground() ? pour : undefined}
                   spoon={hasThing(purse, "thingSpoon") ? { left: usesLeft(purse, "thingSpoon", now), most: USES.thingSpoon?.n ?? 0, told: whisper, busy: asking } : null} onSpoon={askSpoon} onSpoonShut={() => setWhisper(null)}
                   fam={spriteOn ? { left: spriteLeft, most: USES.famSprite?.n ?? 0, may: spriteMay, cooking: spriting } : null} onFam={goSprite}
                   flame={flameHad ? { left: flameLeft, most: USES.thingFlame?.n ?? 0, armed: flameOn } : null} onFlame={setFlameOn} />
    )}
    {feastOpen && feast && inYard && !open && !stirring && (
      <TownFeast th={th} phone={phone} tabbar={tabbar} me={me} pots={served} purse={purse} now={now} most={keeper.helpings()} feast={feast} said={feastSaid} busy={feastBusy}
                 onEat={feastEat} onLadle={(pot) => void feastDo("ladle", pot)} onTake={(pot) => void feastDo("take", pot)} onSet={(slot) => void feastDo("set", null, slot)} onClose={() => setFeastOpen(false)} />
    )}
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && !feastOpen && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {stirring ? (
        <div className="pop-in pointer-events-auto w-full max-w-[26rem]" data-state="open">
          <BuffAura ids={AT_THE_POT.filter((id) => hasBuff(purse, now, id))} th={th} className="mb-1 justify-end rounded-md bg-[#2a190d]/70 px-2 py-1" />
          {/* what is cooked on a stick is roasted over the fire, a game of its own; everything else is stirred */}
          {stirring.crew[0] === "skewer" ? (
            <TownRoasting th={th} title={th ? "ย่างไฟ" : "Roasting"} spent={spent} calm={(1 + buffBy(purse, now, "calm"))} harder={harder} scene={art?.("gameFire") ?? null}
                          onHit={(hit) => { sfx?.wake(); sfx?.work(hit ? "sizzle" : "charred"); if (hit) vfx.add("smoke", null, { lift: 22 }); }}
                          onTurn={() => { sfx?.wake(); sfx?.work("turn", 0.7); }} onFlare={() => { sfx?.wake(); sfx?.work("crackle"); }}
                          onDone={finish} onCancel={() => setStirring(null)} />
          ) : (
            <TownStirring th={th} title={th ? "ทำอาหาร" : "Cooking"} need={stirsWith(stirsFor(stirring.things), cfx)} mods={{ ...stirMods(purse.bag, spent, (1 + buffBy(purse, now, "calm"))), forged: cfx.band, spare: cfx.spared, grace: cfx.grace, steady: cfx.steady }} harder={harder} guide={cfx.guide}
                          onHit={(hit) => { sfx?.wake(); sfx?.work(hit ? "stir" : "clang"); if (hit) vfx.add("steam", null, { lift: 22 }); }}
                          onDone={finish} onCancel={() => setStirring(null)} />
          )}
        </div>
      ) : open || feastOpen ? null : (
        <div className="pointer-events-auto mb-14 flex flex-wrap items-center justify-center gap-2">
          {offers.map((o, i) => (
            <button key={o} type="button" onClick={() => act(o)} data-cook-offer={o}
                    className={`pop-in pressable flex min-h-12 items-center gap-2 rounded-full px-6 text-read font-semibold shadow-xl shadow-black/40 ${i ? "border border-line-lit bg-surface/95 text-ink" : "bg-accent text-bg"}`} data-state="open">
              {/* (which pot it is, is said: there may be several in the bag; and where it goes, when that is the feast table) */}
              {o === "down" && heldPot ? (feast && inYard && heldPot.dish !== ODD
                  ? (th ? `วางหม้อ${ITEMS[heldPot.dish].name.th}บนโต๊ะเลี้ยง` : `Set the pot of ${ITEMS[heldPot.dish].name.en.toLowerCase()} on the feast table`)
                  : th ? `วางหม้อ${ITEMS[heldPot.dish].name.th}` : `Set down the pot of ${ITEMS[heldPot.dish].name.en.toLowerCase()}`)
                : th ? VERB[o][0] : VERB[o][1]}
              {o === "feast" && served.length > 0 && <span className="font-data text-ui font-normal tabular-nums opacity-80">{served.length}</span>}
              {!i && <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
