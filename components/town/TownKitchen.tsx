"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COOKING, type Taste } from "@/lib/town/cooking";
import { toldOf, type Told } from "@/lib/town/hints";
import { WISH } from "@/lib/town/fountain";
import { DISHES, ITEMS, type DishId, type ItemId, type MealBuffId } from "@/lib/town/items";
import { SHELF_WORD, TASTE_WORD, cookwareIn, guessesAt, linesAt, pantry, stocked, toolsAt, type Note } from "@/lib/town/kitchen";
import type { Keeper } from "@/lib/town/keeper";
import { loadKitchen, type Sprite } from "@/lib/town/scenery";
import { staminaOf } from "@/lib/town/stamina";
import type { Purse } from "@/lib/town/trade";
import { BIG, GameScene, STAGE } from "./TownGame";
import TownIcon, { type IconName } from "./TownIcon";
import { Secret } from "./TownScroll";
import { ItemIcon } from "./TownTrade";

/** Where the table is laid: one of the yard's places, or the forest camp's fire. */
export type KitchenPlace = "stove" | "table" | "fire" | "camp";
/** What came of the cooking, for the card that says so. */
export interface KitchenResult { made: ItemId | null; n: number; first: boolean; taste?: Taste; fresh?: boolean }

/** The board's wood and what is written on it; the book's paper and its ink (the scroll's own). */
const WOOD_DARK = "#2a190d", CREAM = "#ffeccb", CREAM_SOFT = "#e9cfa4", HOLLOW = "#3a2513";
const PAPER = "#f0dfb6", PAPER_EDGE = "#d9bf85", INK = "#4a3520", INK_SOFT = "#7a5f3c", JADE = "#2f7d4f", CHILI = "#b23a26";
const PLACE_WORD: Record<KitchenPlace, [string, string]> = {
  stove: ["ที่เตา", "At a stove"], table: ["ที่โต๊ะเตรียมของ", "At a worktable"], fire: ["ที่กองไฟ", "At the fire"], camp: ["ที่กองไฟแคมป์", "At the camp fire"],
};
/**
 * What the cookware stands on at each place: a picture of the cooking screen's own sheet (or the forest's fire, at
 * the camp), how far up it the cookware's foot is, and whether a fire burns under it.
 */
const SCENE: Record<KitchenPlace, { art: string; foot: string; fire: boolean }> = {
  stove: { art: "gameKitchen", foot: "44%", fire: true }, fire: { art: "gameKitchen", foot: "44%", fire: true },
  table: { art: "gameWorktable", foot: "37%", fire: false }, camp: { art: "gameKitchen", foot: "26%", fire: true },
};
/** Where a thing put in is laid: four to a row, two on each side of the cookware. */
const COLS = [1, 2, 4, 5];
const PIN_KEY = "cashtown.kitchen.pin";

/**
 * The kitchen table (the owner, 2026-10-06: "อยากให้ rework UI การทำอาหารให้เข้าใจง่ายขึ้น เปิดสูตรที่มีดูคู่กันไปได้ UI แบบใหม่
 * gen ภาพมาใหม่ได้ เพื่อให้มี theme เหมือนทำอาหาร"; and of how it was to look: "ช่วยทำ UI ออกมาให้ดี และน่าสนใจที่สุดเท่าที่เป้นไปได้").
 * One screen in the place of the little panel of icons:
 *
 * - **the basket**: what the bag has that can go in, shelf by shelf, every thing by its name. A tap puts one in;
 * - **the hearth**: the cookware standing on a stove (a worktable, a fire), chosen here from what the bag has, with
 *   what is in it laid beside it. A tap on a thing takes one back out;
 * - **the recipe book**, open beside it: a recipe one knows is pinned and read while things are put in, each of
 *   its lines saying whether the bag has it and whether it is in. It is for reading: every thing is still put in
 *   by hand ("ใส่วัตถุดิบเองเหมือนเดิม"), and its last thing is as hidden as on its scroll. Under a recipe that still
 *   hides one, the guesses it has had (lib/town/kitchen's notebook);
 * - **what came of it**, on a card: and from there straight on to a helping, or the pot set down for company.
 *
 * It draws and asks; what is cooked is the keeper's to say (components/town/TownCook holds this open and plays the
 * game). On a phone the book folds into a strip above the hearth. With `reduced` nothing moves.
 */
export default function TownKitchen({ th, reduced, place, keeper, purse, now, crew, things, notes, result, why, bottom, fire, eat, onAdd, onDrop, onClear, onTool, onGo, onClose, onAgain, onEat, onPotDown }: {
  th: boolean;
  reduced: boolean;
  place: KitchenPlace;
  keeper: Keeper;
  purse: Purse;
  now: number;
  /** What each cook holds: mine first, then the others standing at the places. */
  crew: Array<ItemId | null>;
  things: Array<[ItemId, number]>;
  notes: Note[];
  result: KitchenResult | null;
  /** A refusal, in words, while it is shown. */
  why: string | null;
  /** How far the screen keeps off the bottom of the map (the phone's tab bar). */
  bottom: string;
  /** The forest camp's fire seen close (the forest's own sheet has it), for a table laid there. */
  fire: Sprite | null;
  /** Whether a helping could be eaten now: a bowl to ladle into, and a meal not yet had. */
  eat: { bowl: boolean; meal: boolean };
  onAdd: (id: ItemId) => void;
  onDrop: (id: ItemId) => void;
  onClear: () => void;
  /** Take up the cookware in a slot of the bag, or put away what is held. */
  onTool: (slot: number | null) => void;
  onGo: () => void;
  onClose: () => void;
  /** From the card of what came of it: back to the table; a helping at once; the pot set down. */
  onAgain: () => void;
  onEat: () => void;
  onPotDown: () => void;
}) {
  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const tool = crew[0], bare = place === "table" || place === "camp";
  const wares = useMemo(() => cookwareIn(purse.bag), [purse.bag]);
  const laid = useMemo(() => pantry(purse.bag), [purse.bag]);
  const put = (id: ItemId) => things.find(([t]) => t === id)?.[1] ?? 0;
  const total = things.reduce((t, [, n]) => t + n, 0);

  // the screen's own pictures: fetched the first time it is opened
  const [art, setArt] = useState<((name: string) => Sprite | null) | null>(null);
  useEffect(() => { let on = true; loadKitchen().then((a) => { if (on) setArt(() => a); }).catch(() => {}); return () => { on = false; }; }, []);
  const scene = SCENE[place], sprite = place === "camp" && fire ? fire : art?.(scene.art) ?? null;

  /* ── the book ── */
  const book = useMemo(() => [...keeper.known(), ...keeper.knownMakes()].map((id) => {
    const told = toldOf(id, keeper.madeBefore(id), keeper.triesAt(id));
    return { id, told, ready: stocked(told, purse.bag), buff: id in DISHES ? DISHES[id as DishId].buff ?? null : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- what is known changes with the purse, which is read anew when the keeper says so
  }), [keeper, purse]);
  const [pin, setPin] = useState<ItemId | null>(null);
  useEffect(() => { try { const kept = window.localStorage.getItem(`${PIN_KEY}.${keeper.id}`); if (kept && kept in ITEMS) setPin(kept as ItemId); } catch { /* a browser that keeps nothing: no recipe is pinned */ } }, [keeper.id]);
  const choose = (id: ItemId | null) => {
    setPin(id);
    try { if (id) window.localStorage.setItem(`${PIN_KEY}.${keeper.id}`, id); else window.localStorage.removeItem(`${PIN_KEY}.${keeper.id}`); } catch { /* not kept */ }
  };
  const pinned = book.find((r) => r.id === pin) ?? null;
  const lines = pinned ? linesAt(pinned.told, purse.bag, things) : [];
  const [tab, setTab] = useState<"book" | "notes">("book");
  const [only, setOnly] = useState<MealBuffId | "makes" | null>(null);
  /** On a phone the book is folded away until its strip is tapped. */
  const [unfolded, setUnfolded] = useState(false);

  // Escape puts away what is uppermost: the card, the unfolded book, then the table
  const board = useRef<HTMLElement>(null);
  useEffect(() => { board.current?.focus(); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (result) onAgain(); else if (unfolded) setUnfolded(false); else onClose();
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, [result, unfolded, onAgain, onClose]);

  // A thing put in is seen going: from its place in the basket to the cookware (nothing, with `reduced`).
  const [flights, setFlights] = useState<Array<{ key: number; id: ItemId; x: number; y: number; dx: number; dy: number }>>([]);
  const ware = useRef<HTMLDivElement>(null), flown = useRef(0);
  const putIn = (id: ItemId, from: HTMLElement) => {
    onAdd(id);
    if (reduced || !board.current || !ware.current) return;
    const b = board.current.getBoundingClientRect(), a = from.getBoundingClientRect(), p = ware.current.getBoundingClientRect();
    const x = a.left + a.width / 2 - b.left, y = a.top + a.height / 3 - b.top;
    setFlights((was) => [...was.slice(-5), { key: ++flown.current, id, x, y, dx: p.left + p.width / 2 - b.left - x, dy: p.top + p.height / 2 - b.top - y }]);
  };

  const mayCook = things.length > 0 && (!!tool || bare);
  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-center bg-black/60 min-[900px]:items-center min-[900px]:px-4 min-[900px]:pt-4" style={{ paddingBottom: bottom }} onClick={onClose}>
      <style href="town-kitchen" precedence="medium">{`
        @keyframes kt-pop { from { transform: scale(.6); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes kt-squash { from { transform: scale(1.1, .88) } to { transform: none } }
        @keyframes kt-steam { 0% { transform: translateY(6px); opacity: 0 } 30% { opacity: .9 } 100% { transform: translateY(-26px); opacity: 0 } }
        @keyframes kt-ember { 0%, 100% { opacity: .22 } 50% { opacity: .5 } }
        @keyframes kt-rise { from { transform: translateY(16px) scale(.94); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes kt-rays { to { transform: rotate(360deg) } }
        .kt-pop { animation: kt-pop 140ms ease-out }
        .kt-squash { animation: kt-squash 180ms ease-out; transform-origin: 50% 100% }
        .kt-steam { animation: kt-steam 2.6s linear infinite }
        .kt-ember { opacity: .3; animation: kt-ember 1.7s steps(4) infinite }
        .kt-rise { animation: kt-rise 320ms cubic-bezier(.2, .8, .2, 1) }
        .kt-rays { animation: kt-rays 14s linear infinite }
        [data-town-kitchen][data-still] .kt-pop, [data-town-kitchen][data-still] .kt-squash, [data-town-kitchen][data-still] .kt-rise,
        [data-town-kitchen][data-still] .kt-ember, [data-town-kitchen][data-still] .kt-rays { animation: none }
        [data-town-kitchen][data-still] .kt-steam { animation: none; opacity: .7 }
      `}</style>
      <section ref={board} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="town-kitchen-h" data-town-kitchen data-still={reduced ? "" : undefined}
               onClick={(e) => e.stopPropagation()} style={{ outline: "none" }}
               className="relative flex size-full max-w-[66rem] select-none flex-col border-[#2a190d] bg-[#6b4424] shadow-[inset_0_0_0_2px_#9c6b3d,0_14px_28px_rgba(0,0,0,0.5)] outline-none min-[900px]:h-auto min-[900px]:max-h-full min-[900px]:rounded-lg min-[900px]:border-[3px]">
        <header className="flex min-h-11 shrink-0 items-center gap-2 px-3 pt-1">
          <TownIcon name="stoveBig" size={26} />
          <h2 id="town-kitchen-h" className="font-display text-title font-semibold [text-shadow:0_2px_0_#2a190d]" style={{ color: CREAM }}>{th ? "โต๊ะครัว" : "The kitchen table"}</h2>
          <span className="truncate font-data text-label" style={{ color: CREAM_SOFT }}>{th ? PLACE_WORD[place][0] : PLACE_WORD[place][1]}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 font-data text-meta tabular-nums" style={{ color: CREAM }} title="Stamina">
            <TownIcon name="stamina" size={16} /><span className="sr-only">Stamina </span>{Math.round(staminaOf(purse, now))}
          </span>
          <button type="button" onClick={onClose} className="pressable min-h-9 shrink-0 rounded-md border-2 border-[#2a190d] bg-[#4a2f18] px-3 text-meta hover:bg-[#5a3a1c]" style={{ color: CREAM }}>{th ? "ปิด" : "Close"}</button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] gap-2 px-2 pb-1 pt-1 min-[900px]:grid-cols-[16.5rem_minmax(0,1fr)_19.5rem] min-[900px]:grid-rows-[minmax(0,1fr)]">
          {/* ── the basket ── */}
          <section aria-label={th ? "ตะกร้าวัตถุดิบ" : "The basket"} className="order-3 flex min-h-0 flex-col overflow-hidden rounded-[4px] border-[3px] border-[#2a190d] min-[900px]:order-1 min-[900px]:max-h-[31rem]" style={{ backgroundColor: HOLLOW }}>
            <h3 className="hidden shrink-0 items-center gap-1.5 border-b-2 border-[#2a190d] bg-[#4a2f18] px-2 py-1 text-ui font-semibold min-[900px]:flex" style={{ color: CREAM }}>
              <TownIcon name="basket" size={18} />{th ? "ตะกร้าวัตถุดิบ" : "The basket"}
            </h3>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 [scrollbar-color:#6b4a2a_transparent] [scrollbar-width:thin]">
              {laid.map(({ shelf, things: on }) => (
                <div key={shelf}>
                  <h4 className="sticky top-0 z-[1] -mx-2 px-2 pb-0.5 pt-1.5 font-data text-label" style={{ color: "#c9a877", backgroundColor: HOLLOW }}>{th ? SHELF_WORD[shelf].th : SHELF_WORD[shelf].en}</h4>
                  <ul className="grid grid-cols-4 gap-1 min-[900px]:grid-cols-3">
                    {on.map(([id, n]) => {
                      const left = n - put(id), marked = lines.some((l) => l.id === id);
                      return (
                        <li key={id}>
                          <button type="button" disabled={left < 1 || (!put(id) && things.length >= COOKING.kinds)} onClick={(e) => putIn(id, e.currentTarget)} data-kitchen-thing={id}
                                  aria-label={`${name(id)} ×${left}`}
                                  className={`pressable relative flex min-h-[3.5rem] w-full flex-col items-center gap-0.5 rounded-[4px] border-2 bg-[#4a3220] px-0.5 pb-1 pt-1.5 text-center min-[900px]:min-h-[4.25rem] hover:bg-[#5a3d27] disabled:opacity-40 ${marked ? "border-[#f0c060]" : "border-[#6b4a2a]"}`}>
                            <ItemIcon id={id} size={28} />
                            <span className="line-clamp-2 w-full break-words font-data text-label leading-tight text-[#f3e3c3]">{name(id)}</span>
                            <span className="absolute right-1 top-0 font-data text-label font-semibold tabular-nums [text-shadow:0_1px_0_#2a190d]" style={{ color: CREAM }}>{left}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {!laid.length && <p className="px-2 py-6 text-center text-ui" style={{ color: "#c9a877" }}>{th ? "ในกระเป๋ายังไม่มีอะไรที่ใส่ได้" : "Nothing in your bag can go in yet"}</p>}
            </div>
          </section>

          {/* ── the hearth ── */}
          <div className="order-2 flex min-w-0 flex-col gap-1.5">
            <div className={`${STAGE} h-[clamp(7.25rem,21dvh,11rem)] w-full min-[900px]:aspect-[3/2] min-[900px]:h-auto`} data-kitchen-stage={place}>
              <GameScene sprite={sprite} className="absolute inset-0 size-full" />
              {scene.fire && place !== "camp" && <span aria-hidden className="kt-ember absolute left-[38%] top-[74%] h-[22%] w-[24%] rounded-[50%] bg-[#ff9a3c] mix-blend-screen blur-[6px]" />}
              {/* what is in: a tap takes one back out */}
              <ul className="absolute inset-x-1 top-1 grid grid-cols-[repeat(2,minmax(0,1fr))_minmax(4.25rem,0.9fr)_repeat(2,minmax(0,1fr))] gap-1" aria-label={th ? "ของที่ใส่แล้ว" : "What is in"}>
                {things.map(([id, n], i) => (
                  <li key={id} style={{ gridColumn: COLS[i % 4], gridRow: Math.floor(i / 4) + 1 }}>
                    <button type="button" onClick={() => onDrop(id)} title={name(id)} data-kitchen-in={id}
                            aria-label={th ? `${name(id)} ×${n} แตะเพื่อเอาออกหนึ่ง` : `${name(id)} ×${n}: take one out`}
                            className="kt-pop pressable flex h-9 w-full items-center justify-center gap-0.5 rounded-[4px] border-2 border-[#2a190d] px-0.5 hover:brightness-95" style={{ backgroundColor: PAPER, color: INK }}>
                      <ItemIcon id={id} size={22} /><span className="font-data text-meta font-semibold tabular-nums">×{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!things.length && <p className="absolute inset-x-0 top-[14%] px-16 text-center text-meta [text-shadow:0_1px_0_#000]" style={{ color: CREAM_SOFT }}>{th ? "แตะของในตะกร้าเพื่อใส่" : "Tap a thing in the basket to put it in"}</p>}
              {/* the cookware, standing on the stove; steam off it once something is in */}
              <div ref={ware} className="absolute left-1/2 flex origin-bottom -translate-x-1/2 scale-[0.82] flex-col items-center min-[900px]:scale-100" style={{ bottom: scene.foot }}>
                {scene.fire && !!tool && things.length > 0 && (
                  <span aria-hidden className="pointer-events-none absolute -top-4 flex gap-4 opacity-70">
                    <TownIcon name="fxSteam" size={16} className="kt-steam" /><span className="kt-steam [animation-delay:-1.3s]"><TownIcon name="fxSteam" size={12} /></span>
                  </span>
                )}
                <span key={total} className="kt-squash block">{tool ? <ItemIcon id={tool} size={68} /> : bare ? <TownIcon name="hand" size={44} className="opacity-80" /> : null}</span>
              </div>
            </div>
            {/* what it is cooked with, taken up here; and who else is at the places */}
            <div className="flex min-h-11 items-center gap-1.5">
              <span className="shrink-0 font-data text-label" style={{ color: CREAM_SOFT }}>{th ? "ทำด้วย" : "With"}</span>
              <div role="radiogroup" aria-label={th ? "เครื่องครัว" : "Cookware"} className="flex min-w-0 items-center gap-1 overflow-x-auto py-0.5">
                {bare && (
                  <button type="button" role="radio" aria-checked={!tool} onClick={() => onTool(null)} title={th ? "มือเปล่า" : "Bare hands"} aria-label={th ? "มือเปล่า" : "Bare hands"} data-kitchen-tool="hand"
                          className={`pressable grid size-10 shrink-0 place-items-center rounded-[4px] border-2 ${!tool ? "border-[#f0c060] bg-[#5a3a1c]" : "border-[#2a190d] bg-[#4a2f18]"}`}>
                    <TownIcon name="hand" size={22} />
                  </button>
                )}
                {wares.map(({ id, slot }) => (
                  <button key={id} type="button" role="radio" aria-checked={tool === id} onClick={() => onTool(slot)} title={name(id)} aria-label={name(id)} data-kitchen-tool={id}
                          className={`pressable grid size-10 shrink-0 place-items-center rounded-[4px] border-2 ${tool === id ? "border-[#f0c060] bg-[#5a3a1c]" : "border-[#2a190d] bg-[#4a2f18]"}`}>
                    <ItemIcon id={id} size={26} />
                  </button>
                ))}
              </div>
              <span className="min-w-0 flex-1 truncate text-meta font-semibold" style={{ color: tool || bare ? CREAM : "#ffb09c" }} data-kitchen-with>
                {tool ? name(tool) : bare ? (th ? "มือเปล่า" : "Bare hands") : wares.length ? (th ? "เลือกเครื่องครัวก่อน" : "Choose your cookware") : (th ? "ยังไม่มีเครื่องครัวในกระเป๋า" : "No cookware in your bag yet")}
              </span>
              {crew.length > 1 && (
                <span className="flex shrink-0 items-center gap-1" aria-label={th ? `ผู้ช่วย ${crew.length - 1} คน` : `${crew.length - 1} helping`}>
                  {crew.slice(1).map((c, i) => (
                    <span key={i} className="grid size-8 place-items-center rounded-full border-2 border-[#2a190d] bg-[#4a2f18]">{c ? <ItemIcon id={c} size={20} /> : <TownIcon name="hand" size={18} />}</span>
                  ))}
                </span>
              )}
            </div>
            {/* what is in, in words */}
            <p className="hidden min-h-[1.25rem] text-meta leading-snug min-[900px]:block" style={{ color: CREAM_SOFT }}>{things.map(([id, n]) => `${name(id)} ×${n}`).join(" · ")}</p>
          </div>

          {/* ── the book: a strip to unfold on a phone, a page beside the hearth on a wide screen ── */}
          <button type="button" onClick={() => setUnfolded(true)} aria-expanded={unfolded} data-kitchen-strip
                  className="pressable order-1 flex min-h-11 items-center gap-2 rounded-[4px] border-2 border-[#2a190d] px-2 text-left min-[900px]:hidden" style={{ backgroundColor: PAPER, color: INK }}>
            <TownIcon name="recipes" size={22} className="shrink-0" />
            {pinned ? (
              <>
                <span className="min-w-0 shrink truncate text-ui font-semibold">{name(pinned.id)}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                  {lines.map((l) => (
                    <span key={l.id} className="flex shrink-0 items-center rounded-sm px-0.5" style={{ backgroundColor: l.state === "in" ? "rgba(47,125,79,0.2)" : l.state === "short" ? "rgba(178,58,38,0.16)" : "transparent" }}>
                      <ItemIcon id={l.id} size={18} /><span className="font-data text-label tabular-nums">{l.put}/{l.need}</span>
                    </span>
                  ))}
                  {pinned.told.last && <TownIcon name="mystery" size={16} className="shrink-0" />}
                </span>
              </>
            ) : <span className="min-w-0 flex-1 truncate text-ui font-semibold">{th ? `สมุดสูตร · ${book.length} สูตร` : `Recipe book · ${book.length}`}</span>}
            <span aria-hidden className="shrink-0 font-data text-meta" style={{ color: INK_SOFT }}>{th ? "เปิด" : "Open"}</span>
          </button>
          <section aria-label={th ? "สมุดสูตร" : "The recipe book"} data-kitchen-book
                   className={`${unfolded ? "absolute inset-x-2 bottom-2 top-12 z-10 flex" : "hidden"} min-h-0 flex-col overflow-hidden rounded-[4px] border-[3px] border-[#2a190d] min-[900px]:static min-[900px]:order-3 min-[900px]:flex min-[900px]:max-h-[31rem]`}
                   style={{ color: INK, backgroundColor: PAPER, backgroundImage: `linear-gradient(90deg, ${PAPER_EDGE} 0, transparent 7%, transparent 93%, ${PAPER_EDGE} 100%)` }}>
            <div className="flex shrink-0 items-center gap-1 border-b-2 px-2 py-1" style={{ borderColor: PAPER_EDGE }} role="tablist">
              <TownIcon name="recipes" size={20} />
              {(["book", "notes"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-kitchen-tab={t}
                        className="pressable min-h-9 rounded-md px-2 text-ui font-semibold" style={tab === t ? { backgroundColor: INK, color: PAPER } : { color: INK_SOFT }}>
                  {t === "book" ? (th ? `สมุดสูตร ${book.length}` : `Recipes ${book.length}`) : (th ? `ที่ลองไว้ ${notes.length}` : `Tried ${notes.length}`)}
                </button>
              ))}
              <button type="button" onClick={() => setUnfolded(false)} className="pressable ml-auto min-h-9 rounded-md px-2 text-meta font-semibold min-[900px]:hidden" style={{ color: INK_SOFT }}>{th ? "พับเก็บ" : "Fold away"}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-2 [scrollbar-color:#b99a5e_transparent] [scrollbar-width:thin]">
              {tab === "notes" ? <Tried notes={notes} th={th} />
                : pinned ? <Page id={pinned.id} told={pinned.told} lines={lines} purse={purse} crew={crew} notes={notes} th={th} onBack={() => choose(null)} />
                  : <Index book={book} only={only} onOnly={setOnly} th={th} onPick={choose} />}
            </div>
          </section>
        </div>

        <footer className="shrink-0 px-2 pb-2 min-[900px]:grid min-[900px]:grid-cols-[16.5rem_minmax(0,1fr)_19.5rem] min-[900px]:gap-x-2">
          <p className="min-h-[1.125rem] truncate text-center text-meta min-[900px]:col-start-2" style={{ color: "#ffb09c" }} aria-live="polite" data-kitchen-why>{why ?? ""}</p>
          <div className="flex items-center gap-2 min-[900px]:col-start-2">
            <button type="button" disabled={!things.length} onClick={onClear} className="pressable min-h-12 shrink-0 rounded-md border-2 border-[#2a190d] bg-[#4a2f18] px-3 text-meta disabled:opacity-40" style={{ color: CREAM }}>{th ? "เอาออกหมด" : "Take all out"}</button>
            <button type="button" disabled={!mayCook} onClick={onGo} data-kitchen-go className={`${BIG} disabled:opacity-45`}>{th ? "ลงมือทำ" : "Cook it"}</button>
          </div>
        </footer>

        {flights.map((fl) => (
          <span key={fl.key} aria-hidden className="pointer-events-none absolute z-10 -ml-3.5 -mt-3.5" style={{ left: fl.x, top: fl.y }}
                ref={(el) => {
                  if (!el || el.dataset.flown) return;
                  el.dataset.flown = "1";
                  el.animate([{ transform: "translate(0, 0) scale(1)", opacity: 1 }, { transform: `translate(${fl.dx}px, ${fl.dy}px) scale(0.55)`, opacity: 0.4 }], { duration: 240, easing: "cubic-bezier(0.4, 0, 0.7, 0.4)" })
                    .onfinish = () => setFlights((was) => was.filter((w) => w.key !== fl.key));
                }}>
            <ItemIcon id={fl.id} size={28} />
          </span>
        ))}
        {result && <Came result={result} th={th} eat={eat} why={why} onAgain={onAgain} onEat={onEat} onPotDown={onPotDown} onClose={onClose} />}
      </section>
    </div>
  );
}

type Entry = { id: ItemId; told: Told; ready: boolean; buff: MealBuffId | null };
const SMALL = "font-data text-label";

/** The book's index: every recipe one knows, what can be made of the bag first; by the buff it leaves, if one is asked for. */
function Index({ book, only, onOnly, th, onPick }: { book: Entry[]; only: MealBuffId | "makes" | null; onOnly: (b: MealBuffId | "makes" | null) => void; th: boolean; onPick: (id: ItemId) => void }) {
  const buffs = [...new Set(book.flatMap((r) => (r.buff ? [r.buff] : [])))], makes = book.some((r) => !(r.id in DISHES));
  const shown = book.filter((r) => (only === null ? true : only === "makes" ? !(r.id in DISHES) : r.buff === only))
    .sort((a, b) => Number(b.ready) - Number(a.ready) || Number(!!a.told.last) - Number(!!b.told.last) || (th ? ITEMS[a.id].name.th.localeCompare(ITEMS[b.id].name.th, "th") : ITEMS[a.id].name.en.localeCompare(ITEMS[b.id].name.en)));
  if (!book.length) return <p className="px-2 py-8 text-center text-ui" style={{ color: INK_SOFT }}>{th ? "ยังไม่มีสูตรในสมุด" : "No recipe in the book yet"}</p>;
  const chip = (on: boolean) => ({ backgroundColor: on ? INK : "rgba(74,53,32,0.1)", color: on ? PAPER : INK });
  return (
    <>
      {(buffs.length > 0 || makes) && (
        <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label={th ? "กรองตามบัฟ" : "By what it leaves"}>
          <button type="button" aria-pressed={only === null} onClick={() => onOnly(null)} className="pressable min-h-8 rounded-full px-2.5 text-meta font-semibold" style={chip(only === null)}>{th ? "ทั้งหมด" : "All"}</button>
          {buffs.map((b) => (
            <button key={b} type="button" aria-pressed={only === b} onClick={() => onOnly(only === b ? null : b)} data-kitchen-buff={b}
                    className="pressable flex min-h-8 items-center gap-1 rounded-full pl-1.5 pr-2.5 text-meta font-semibold" style={chip(only === b)}>
              <TownIcon name={WISH[b].icon as IconName} size={18} />{th ? WISH[b].name.th : WISH[b].name.en}
            </button>
          ))}
          {makes && <button type="button" aria-pressed={only === "makes"} onClick={() => onOnly(only === "makes" ? null : "makes")} className="pressable min-h-8 rounded-full px-2.5 text-meta font-semibold" style={chip(only === "makes")}>{th ? "ของใช้" : "Things"}</button>}
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {shown.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onPick(r.id)} data-kitchen-recipe={r.id}
                    className="pressable flex min-h-11 w-full items-center gap-2 rounded-md px-1.5 text-left hover:bg-[rgba(74,53,32,0.1)]">
              <ItemIcon id={r.id} size={28} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-ui font-semibold">{th ? ITEMS[r.id].name.th : ITEMS[r.id].name.en}</span>
              {r.buff && <TownIcon name={WISH[r.buff].icon as IconName} size={18} className="shrink-0" />}
              {r.told.last && <TownIcon name="mystery" size={18} className="shrink-0" />}
              {r.ready && <span className={`${SMALL} shrink-0 rounded-full px-1.5 py-0.5 font-semibold text-white`} style={{ backgroundColor: JADE }}>{r.told.last ? (th ? "พร้อมลอง" : "To try") : (th ? "ของครบ" : "Ready")}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A recipe, pinned open beside the hearth: its lines against the bag and the pot, its hidden thing as its scroll tells it, and the guesses that has had. */
function Page({ id, told, lines, purse, crew, notes, th, onBack }: {
  id: ItemId; told: Told; lines: ReturnType<typeof linesAt>; purse: Purse; crew: Array<ItemId | null>; notes: Note[]; th: boolean; onBack: () => void;
}) {
  const name = (t: ItemId) => (th ? ITEMS[t].name.th : ITEMS[t].name.en);
  const d = id in DISHES ? DISHES[id as DishId] : null, guesses = guessesAt(told, notes), tools = toolsAt(told, purse.bag, crew);
  const head = `${SMALL} ${th ? "" : "uppercase tracking-wider"}`;
  return (
    <div data-kitchen-page={id}>
      <button type="button" onClick={onBack} className="pressable -ml-1 min-h-9 rounded-md px-1.5 text-meta font-semibold" style={{ color: INK_SOFT }}>{th ? "‹ สูตรทั้งหมด" : "‹ All recipes"}</button>
      <div className="mt-0.5 flex items-center gap-2.5">
        <ItemIcon id={id} size={48} className="shrink-0" />
        <div className="min-w-0">
          <h4 className="font-display text-title font-semibold leading-tight">{name(id)}</h4>
          <p className="truncate text-meta" style={{ color: INK_SOFT }}>{th ? ITEMS[id].name.en : ITEMS[id].name.th}</p>
        </div>
      </div>
      <h5 className={`${head} mt-2.5`} style={{ color: INK_SOFT }}>{th ? "ของที่ใช้" : "What goes in"}</h5>
      <ul className="mt-1 flex flex-col gap-1">
        {lines.map((l) => (
          <li key={l.id} className="flex items-center gap-2 text-ui" data-kitchen-line={l.id} data-state={l.state}>
            <ItemIcon id={l.id} size={24} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate font-semibold">{name(l.id)}</span>
            <span className="font-data tabular-nums">×{l.need}</span>
            <span className={`${SMALL} flex min-w-[3.6rem] items-center justify-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold`}
                  style={l.state === "in" ? { backgroundColor: JADE, color: "#fff" } : l.state === "short" ? { backgroundColor: "rgba(178,58,38,0.14)", color: CHILI } : { backgroundColor: "rgba(74,53,32,0.1)", color: INK }}>
              {l.state === "in" ? (th ? "ใส่แล้ว" : "In")
                : l.put > 0 ? (th ? `ใส่ ${l.put}/${l.need}` : `${l.put}/${l.need} in`)
                  : l.state === "short" ? (th ? `ขาด ${l.need - l.have}` : `${l.need - l.have} short`) : (th ? `มี ${l.have}` : `Have ${l.have}`)}
            </span>
          </li>
        ))}
        {told.last && <Secret hidden={told.last} th={th} />}
      </ul>
      {/* the guesses its hidden thing has had: what else went in beside these lines, and how it tasted */}
      {guesses.length > 0 && (
        <>
          <h5 className={`${head} mt-2.5`} style={{ color: INK_SOFT }}>{th ? "ที่ลองไปแล้ว" : "Tried so far"}</h5>
          <ul className="mt-1 flex flex-col gap-1" data-kitchen-guesses={guesses.length}>
            {guesses.slice(0, 8).map((g) => (
              <li key={g.at} className="flex items-start gap-1.5 text-meta leading-snug">
                <span className="flex shrink-0 flex-wrap items-center gap-1">
                  {g.put.length ? g.put.map(([t, n]) => <span key={t} className="flex items-center gap-0.5 font-semibold" title={name(t)}><ItemIcon id={t} size={18} />{name(t)} ×{n}</span>)
                    : <span className="font-semibold" style={{ color: INK_SOFT }}>{th ? "ไม่ได้ใส่อะไรเพิ่ม" : "Nothing more"}</span>}
                </span>
                {g.taste && <span className="min-w-0 flex-1" style={{ color: INK_SOFT }}>{th ? TASTE_WORD[g.taste].th : TASTE_WORD[g.taste].en}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      <dl className="mt-2.5 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 border-t pt-2 text-ui" style={{ borderColor: PAPER_EDGE }}>
        <dt style={{ color: INK_SOFT }}>{th ? "ทำใน" : "Cooked in"}</dt>
        <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
          {tools.map((t) => (
            <span key={t.id} className="flex items-center gap-1" data-kitchen-ware={t.id} data-state={t.state}>
              <ItemIcon id={t.id} size={22} />{name(t.id)}
              <span className={`${SMALL} font-normal`} style={{ color: t.state === "held" ? JADE : t.state === "none" ? CHILI : INK_SOFT }}>
                {t.state === "held" ? (th ? "ถืออยู่" : "in hand") : t.state === "bag" ? (th ? "อยู่ในกระเป๋า" : "in your bag") : (th ? "ยังไม่มี" : "not here")}
              </span>
            </span>
          ))}
          {!told.in.length && <span className="flex items-center gap-1.5"><TownIcon name="hand" size={20} />{th ? "มือเปล่า ที่โต๊ะ" : "Bare hands, at a worktable"}</span>}
        </dd>
        <dt style={{ color: INK_SOFT }}>{th ? "ได้" : "Makes"}</dt>
        <dd className="font-semibold">{d ? (th ? `${told.gives} ที่` : `${told.gives} helping${told.gives === 1 ? "" : "s"}`) : `×${told.gives}`}</dd>
        {told.cooks > 1 && <><dt style={{ color: INK_SOFT }}>{th ? "คนทำ" : "Cooks"}</dt><dd className="font-semibold">{th ? `ต้องช่วยกัน ${told.cooks} คน` : `${told.cooks}, together`}</dd></>}
        {d && <><dt style={{ color: INK_SOFT }}>{th ? "กินแล้วได้" : "Gives"}</dt>
          <dd className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-semibold">
            <span className="flex items-center gap-1"><TownIcon name="stamina" size={16} />+{d.stamina}</span>
            {d.buff && <span className="flex items-center gap-1"><TownIcon name={WISH[d.buff].icon as IconName} size={18} />{th ? WISH[d.buff].name.th : WISH[d.buff].name.en}</span>}
          </dd></>}
      </dl>
    </div>
  );
}

/** The notebook: what was put together before, and what came of each, the newest first. */
function Tried({ notes, th }: { notes: Note[]; th: boolean }) {
  const name = (t: ItemId) => (th ? ITEMS[t].name.th : ITEMS[t].name.en);
  if (!notes.length) return <p className="px-2 py-8 text-center text-ui" style={{ color: INK_SOFT }}>{th ? "ยังไม่ได้ลองทำอะไร ลองแล้วจะจดไว้ให้ตรงนี้" : "Nothing tried yet. What you try is written down here."}</p>;
  return (
    <ul className="flex flex-col gap-1.5" data-kitchen-notes={notes.length}>
      {notes.map((n) => (
        <li key={n.at} className="rounded-md px-2 py-1.5" style={{ backgroundColor: "rgba(74,53,32,0.08)" }}>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta">
            {n.tool ? <ItemIcon id={n.tool} size={18} /> : <TownIcon name="hand" size={16} />}
            {n.things.map(([t, k]) => <span key={t} className="flex items-center gap-0.5" title={name(t)}><ItemIcon id={t} size={18} /><span className="font-data tabular-nums">×{k}</span></span>)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-meta font-semibold" style={{ color: n.taste ? INK_SOFT : JADE }}>
            {n.made && !n.taste && <ItemIcon id={n.made} size={18} />}
            {n.taste ? (th ? TASTE_WORD[n.taste].th : TASTE_WORD[n.taste].en) : n.made ? `${name(n.made)} ×${n.n}` : (th ? "ไม่ได้อะไรเลย" : "Nothing came of it")}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** What came of the cooking, on a card over the table: and where to go from there. */
function Came({ result, th, eat, why, onAgain, onEat, onPotDown, onClose }: {
  result: KitchenResult; th: boolean; eat: { bowl: boolean; meal: boolean }; why: string | null; onAgain: () => void; onEat: () => void; onPotDown: () => void; onClose: () => void;
}) {
  const { made, n, first, taste } = result;
  const pot = !!made && made in DISHES, found = !!made && !taste;
  const first1 = useRef<HTMLButtonElement>(null);
  useEffect(() => { first1.current?.focus(); }, []);
  const title = !made ? (th ? "ไม่ได้อะไรเลย" : "Nothing came of it") : th ? ITEMS[made].name.th : ITEMS[made].name.en;
  const plain = "pressable min-h-11 rounded-md border-2 px-3 text-ui font-semibold disabled:opacity-45";
  return (
    <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-[#1c0f06]/80 p-3 min-[900px]:rounded-[5px]" data-kitchen-came={found ? "found" : made ? "odd" : "nothing"}>
      <div role="alertdialog" aria-labelledby="town-kitchen-came-h" className="kt-rise w-full max-w-[21rem] rounded-lg border-[3px] border-[#2a190d] px-4 pb-4 pt-3 text-center shadow-[0_14px_28px_rgba(0,0,0,0.5)]" style={{ backgroundColor: PAPER, color: INK }}>
        {first && found && <p className="mx-auto mb-1 w-fit rounded-full px-3 py-0.5 text-meta font-semibold text-white" style={{ backgroundColor: CHILI }}>{th ? "พบสูตรใหม่!" : "A new recipe!"}</p>}
        <div className="relative mx-auto grid size-28 place-items-center">
          {first && found && <span aria-hidden className="kt-rays absolute inset-0 rounded-full opacity-60" style={{ background: "repeating-conic-gradient(rgba(240,192,96,0.9) 0 12deg, transparent 12deg 30deg)", maskImage: "radial-gradient(circle, #000 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)" }} />}
          {made ? <ItemIcon id={made} size={80} className="relative" /> : <TownIcon name="potEmpty" size={72} className="relative opacity-80" />}
          {pot && found && <span aria-hidden className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2"><TownIcon name="fxSteam" size={22} className="kt-steam" /></span>}
        </div>
        <h3 id="town-kitchen-came-h" className="font-display text-title font-semibold leading-tight">{title}</h3>
        {made && <p className="font-data text-ui tabular-nums" style={{ color: INK_SOFT }}>{pot ? (th ? `${n} ที่` : `${n} helping${n === 1 ? "" : "s"}`) : `×${n}`}</p>}
        {taste && <p className="mt-1.5 rounded-md px-2 py-1.5 text-ui font-semibold" style={{ backgroundColor: "rgba(74,53,32,0.1)" }} data-kitchen-taste={taste}>{th ? TASTE_WORD[taste].th : TASTE_WORD[taste].en}</p>}
        <p className="min-h-[1.125rem] text-meta" style={{ color: CHILI }} aria-live="polite">{why ?? ""}</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {!found && <button ref={first1} type="button" onClick={onAgain} data-kitchen-again className={`${plain} border-[#2a190d]`} style={{ backgroundColor: INK, color: PAPER }}>{th ? "ลองใหม่" : "Try again"}</button>}
          {pot && (
            <>
              <button ref={found ? first1 : undefined} type="button" disabled={!eat.bowl || !eat.meal} onClick={onEat} data-kitchen-eat
                      className={`${plain} flex items-center justify-center gap-1.5 border-[#2a190d]`} style={found ? { backgroundColor: INK, color: PAPER } : { borderColor: INK_SOFT }}>
                <TownIcon name="meal" size={20} />{th ? "ตักกินเลย" : "Ladle one and eat"}
              </button>
              {(!eat.bowl || !eat.meal) && <p className="-mt-0.5 text-meta" style={{ color: CHILI }}>{!eat.meal ? (th ? "มื้อนี้กินครบแล้ว" : "This meal's helpings are eaten") : (th ? "ไม่มีถ้วยว่าง" : "No bowl to spare")}</p>}
              <button type="button" onClick={onPotDown} data-kitchen-down className={`${plain} flex items-center justify-center gap-1.5`} style={{ borderColor: INK_SOFT }}>
                <TownIcon name="potFull" size={20} />{th ? "วางหม้อให้เพื่อน" : "Set the pot down for company"}
              </button>
            </>
          )}
          <div className="flex gap-1.5">
            {found && <button ref={pot ? undefined : first1} type="button" onClick={onAgain} data-kitchen-again className={`${plain} flex-1`} style={{ borderColor: INK_SOFT }}>{th ? "ทำต่อ" : "Cook more"}</button>}
            <button type="button" onClick={onClose} className={`${plain} flex-1`} style={{ borderColor: INK_SOFT }}>{th ? "ปิด" : "Close"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
