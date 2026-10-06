"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COOKING, isFind, mayTake, reachOf, stirMods, stirsFor, type Pot } from "@/lib/town/cooking";
import { BOWL, DISHES, ITEMS, potIconOf, type DishId, type ItemId } from "@/lib/town/items";
import { TASTE_WORD, keepNote, readNotes, type Note } from "@/lib/town/kitchen";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import { charmBy } from "@/lib/town/gifts";
import { buffBy, hasBuff, isSpent, mayEat } from "@/lib/town/stamina";
import { handOf, held } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import { KITCHEN, onYard } from "@/lib/town/world";
import { YARD } from "@/lib/town/yard";
import type { FarmDraw } from "./TownFarm";
import { ICON_ATLAS, type IconName } from "./TownIcon";
import type { GameResult } from "./TownGame";
import { AT_THE_POT, BURST, BuffAura } from "./TownBuffFx";
import TownKitchen, { type KitchenResult } from "./TownKitchen";
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
  bowl:["ไม่มีถ้วยว่าง", "No bowl to spare"],
};
/** Where the kitchen's notebook is kept, a member: what was tried and what came of it (lib/town/kitchen). */
const NOTES_KEY = "cashtown.kitchen.notes";
type Offer = "cook" | "down" | "ladle" | "take" | "water";
const VERB: Record<Offer, [string, string]> = {
  cook: ["ทำอาหาร", "Cook"], down: ["วางหม้อ", "Set the pot down"], ladle: ["ตักใส่ถ้วย", "Ladle a helping"], take: ["เก็บหม้อ", "Take the pot"],
  water: ["เทน้ำใส่โอ่ง", "Pour it into the jar"],
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
 *   what the bag has (or, at a worktable, bare hands), things from the bag
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
 * Nothing says what makes what. It also draws the pots that stand about, and
 * how much water the jar has.
 * What is kept is the keeper's (lib/town/keeper): the database's for a member,
 * the browser's trial in `next dev`'s test room.
 */
export default function TownCook({ me, keeper, called, th, here, crew, cooks: others, sfx, bottom, register, onOpen, art, reduced = false, onEatNow }: {
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
      for (const pot of potsRef.current) {
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
      const d = Math.hypot(pot.at[0] - here.tile[0], pot.at[1] - here.tile[1]);
      if (d <= reachOf(pot) && d < far) { best = pot; far = d; }
    }
    return best;
  }, [here, pots]);
  const atPlace = here?.place === "stove" || here?.place === "table" || here?.place === "fire" || here?.place === "camp";
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
  const finish = useCallback(async (result: GameResult) => {
    const job = stirring;
    setStirring(null);
    if (!job) return;
    const did = await keeper.cookDo(job.things, job.crew, others, { hits: result.hits, misses: result.misses, secs: result.secs, need: result.need }, called);
    if (!did.ok) { say(did.why); return; }
    // (a recipe's dish is a go won; the odd dish, and nothing, are not)
    const right = isFind(did.made);
    keeper.record({ game: "cooking", at: keeper.now(), won: right, secs: result.secs, spent: isSpent(purse, now), buff: null, what: did.made ?? "nothing", need: result.need, hits: result.hits, misses: result.misses });
    setThings([]);
    setRefusal(null);
    jot({ at: keeper.now(), things: job.things, tool: job.crew[0], cooks: job.crew.length, made: did.made, n: did.n + (did.fresh ? YARD.gives : 0), ...(did.taste ? { taste: did.taste } : {}), ...(did.first ? { first: true } : {}) });
    setResult({ made: did.made, n: did.n + (did.fresh ? YARD.gives : 0), first: did.first, ...(did.taste ? { taste: did.taste } : {}) });
    // what comes off the pot, and what it sounds like: a dish, something made, an odd dish, or nothing
    const odd = !right && !!did.made, cooked = right && did.made! in DISHES;
    sfx?.wake();
    sfx?.work(cooked ? "cooked" : right ? "made" : odd ? "odd" : "nothing");
    vfx.add(right ? "sparkle" : odd ? "smoke" : "dust", null, { lift: 20 });
    if (cooked) vfx.add("steam", null, { lift: 22 });
    // (the fountain's big pot gave a helping more: its own burst over the pot)
    if ((cooked || odd) && hasBuff(purse, now, "feast")) vfx.add("bless", null, { icon: BURST.feast, lift: 30 });
    if (did.made) vfx.add("pop", null, { icon: did.made, lift: 24 });
    // (the pot took a bucketful of the yard's jar: water over it, and a helping more than the stirring made)
    if (did.fresh) vfx.add("water", null, { lift: 26 });
    const helpings = did.n + (did.fresh ? YARD.gives : 0);
    // (what is no recipe's is tasted: how near it was to something)
    const taste = did.taste ? ` · ${th ? TASTE_WORD[did.taste].th : TASTE_WORD[did.taste].en}` : "";
    if (!did.made) { setNote(`${th ? "ไม่ได้อะไรเลย" : "Nothing came of it"}${taste}`); return; }
    const dish = did.made in DISHES;
    setNote(`${did.first ? (th ? "พบสูตรใหม่! " : "A new recipe! ") : ""}${name(did.made)} ${dish ? (th ? `· ${helpings} ที่` : `· ${helpings} helpings`) : `×${did.n}`}${taste}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse and the clock are read when the dish is done
  }, [stirring, keeper, others, th, sfx, name, say, called, vfx, jot]);

  /* ── from the card of what came of it ── */
  /** A helping of the pot just cooked, into a bowl, and off to eat it: the map finds somewhere to sit. */
  const eatNow = useCallback(async () => {
    const dish = result?.made;
    if (!dish) return;
    const slot = keeper.purse().bag.findIndex((b) => b?.item === "potFull" && b.of?.dish === dish);
    if (slot < 0) { say("none"); return; }
    const did = await keeper.serve(slot);
    if (!did.ok) { say(did.why === "tool" ? "bowl" : did.why); return; }
    sfx?.wake(); sfx?.work("ladle");
    setResult(null);
    setOpen(false);
    onEatNow?.(did.dish);
  }, [result, keeper, say, sfx, onEatNow]);
  /** The pot just cooked, set down where I stand, for whoever comes with a bowl. */
  const potDown = useCallback(async () => {
    if (!here) return;
    const did = await keeper.potDown(here.tile);
    if (!did.ok) { say(did.why); return; }
    sfx?.wake(); sfx?.work("down");
    vfx.add("dust", null, { lift: 2 });
    setResult(null);
    setOpen(false);
  }, [here, keeper, say, sfx, vfx]);

  /* ── pots ── */
  const act = useCallback(async (offer: Offer) => {
    if (offer === "cook") { setResult(null); setOpen(true); return; }
    if (offer === "water") {
      const poured = await keeper.yardPour(here?.tile ?? null);
      if (!poured.ok) { say(poured.why); return; }
      sfx?.wake();
      sfx?.work("pour");
      vfx.add("splash", JAR_AT, { lift: 30 });
      setNote(`${th ? "โอ่งน้ำ" : "Water jar"} ${keeper.yardJar() ?? 0}/${YARD.holds}`);
      return;
    }
    const did = offer === "down" ? (here ? await keeper.potDown(here.tile) : null)
      : offer === "ladle" ? (near ? await keeper.potLadle(near.id, here?.tile ?? null) : null) : (near ? await keeper.potTake(near.id, here?.tile ?? null) : null);
    if (!did) return;
    if (!did.ok) { say(offer === "ladle" && did.why === "tool" ? "bowl" : did.why); return; }
    sfx?.wake();
    sfx?.work(offer === "ladle" ? "ladle" : "down");
    if (offer === "ladle" && near) vfx.add("steam", { x: near.at[0] + 0.8, y: near.at[1] + 0.8 }, { lift: 16 });
    else vfx.add("dust", null, { lift: 2 });
    if (offer === "ladle" && near) setNote(`${name(near.dish)} ×1`);
  }, [keeper, here, near, sfx, name, say, vfx]);

  // The space bar is the first thing on offer (while a game or the cooking panel is up it is theirs).
  const first = offers[0];
  useEffect(() => {
    if (open || stirring || !first) return;
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
  }, [open, stirring, first, act]);

  // (for scripts in `next dev`)
  useEffect(() => {
    const handle = {
      offers: () => offers, act, pots: () => keeper.pots(), crew: () => cooks, open: () => open, things: () => things,
      put: (list: Array<[ItemId, number]>) => setThings(list), go, found: () => keeper.found(),
      // (the kitchen table: what came of the last go while its card is up, the card's ways on, the notebook)
      result: () => result, again: () => setResult(null), eatNow, potDown, notes: () => notes, tool: takeUp, shut: () => { setResult(null); setOpen(false); },
      places: () => KITCHEN.places, floor: () => KITCHEN.floor, note: () => note,
      wash: () => KITCHEN.wash, jar: () => keeper.yardJar(),
    };
    (window as unknown as { __townCook?: typeof handle }).__townCook = handle;
    return () => { delete (window as unknown as { __townCook?: typeof handle }).__townCook; };
  });

  const spent = isSpent(purse, now);
  const table = open && !stirring && atPlace;
  if (!open && !stirring && !offers.length && !note) return null;
  return (
    <>
    {table && (
      <TownKitchen th={th} reduced={reduced} place={here!.place as "stove" | "table" | "fire" | "camp"} keeper={keeper} purse={purse} now={now} crew={cooks} things={things} notes={notes}
                   result={result} why={refusal} bottom={bottom} fire={art?.("gameFire") ?? null}
                   eat={{ bowl: held(purse.bag, BOWL) > 0, meal: mayEat(purse, now, keeper.helpings()) }}
                   onAdd={add} onDrop={drop} onClear={() => setThings([])} onTool={takeUp} onGo={go} onClose={() => { setResult(null); setOpen(false); }}
                   onAgain={() => setResult(null)} onEat={eatNow} onPotDown={potDown} />
    )}
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {stirring ? (
        <div className="pop-in pointer-events-auto w-full max-w-[26rem]" data-state="open">
          <BuffAura ids={AT_THE_POT.filter((id) => hasBuff(purse, now, id))} th={th} className="mb-1 justify-end rounded-md bg-[#2a190d]/70 px-2 py-1" />
          {/* what is cooked on a stick is roasted over the fire, a game of its own; everything else is stirred */}
          {stirring.crew[0] === "skewer" ? (
            <TownRoasting th={th} title={th ? "ย่างไฟ" : "Roasting"} spent={spent} calm={(1 + buffBy(purse, now, "calm")) * charmBy(purse, "charmApron")} scene={art?.("gameFire") ?? null}
                          onHit={(hit) => { sfx?.wake(); sfx?.work(hit ? "sizzle" : "charred"); if (hit) vfx.add("smoke", null, { lift: 22 }); }}
                          onTurn={() => { sfx?.wake(); sfx?.work("turn", 0.7); }} onFlare={() => { sfx?.wake(); sfx?.work("crackle"); }}
                          onDone={finish} onCancel={() => setStirring(null)} />
          ) : (
            <TownStirring th={th} title={th ? "ทำอาหาร" : "Cooking"} need={stirsFor(stirring.things)} mods={stirMods(purse.bag, spent, (1 + buffBy(purse, now, "calm")) * charmBy(purse, "charmApron"))}
                          onHit={(hit) => { sfx?.wake(); sfx?.work(hit ? "stir" : "clang"); if (hit) vfx.add("steam", null, { lift: 22 }); }}
                          onDone={finish} onCancel={() => setStirring(null)} />
          )}
        </div>
      ) : open ? null : (
        <div className="pointer-events-auto mb-14 flex flex-wrap items-center justify-center gap-2">
          {offers.map((o, i) => (
            <button key={o} type="button" onClick={() => act(o)}
                    className={`pop-in pressable flex min-h-12 items-center gap-2 rounded-full px-6 text-read font-semibold shadow-xl shadow-black/40 ${i ? "border border-line-lit bg-surface/95 text-ink" : "bg-accent text-bg"}`} data-state="open">
              {th ? VERB[o][0] : VERB[o][1]}
              {!i && <kbd aria-hidden className="hidden rounded border border-bg/40 px-1.5 py-px font-data text-label font-normal uppercase tracking-wider text-bg/80 sm:inline">Space</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
