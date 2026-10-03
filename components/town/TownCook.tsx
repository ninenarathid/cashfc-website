"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COOKING, easeOf, goesIn, isCookware, isFind, mayTake, reachOf, stirsFor, type Pot, type Taste } from "@/lib/town/cooking";
import { DISHES, ITEMS, potIconOf, type ItemId } from "@/lib/town/items";
import type { FishSfx } from "@/lib/town/sfx";
import { isSpent } from "@/lib/town/stamina";
import { handOf, held } from "@/lib/town/trade";
import type { Keeper } from "@/lib/town/keeper";
import { KITCHEN, onYard } from "@/lib/town/world";
import type { FarmDraw } from "./TownFarm";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import TownTiming, { type TimingResult } from "./TownTiming";
import { ItemIcon, WHY } from "./TownTrade";
import { Vfx } from "./vfx";

/** Where I stand still: my tile, and what of the cooking yard I am at there. */
export interface Standing { tile: [number, number]; place: "stove" | "table" | "fire" | "wash" | null }

/** Why not, in the kitchen's own words (the rest are the trade's). */
const WHY_COOK: Record<string, [string, string]> = {
  tool: ["ของในมือทำสิ่งนี้ไม่ได้", "What you hold will not make this"], none: ["ของในกระเป๋าไม่พอ", "Not enough of that in your bag"],
  amount: ["ยังไม่ได้ใส่อะไร", "Nothing is in yet"],
  bowl:["ไม่มีถ้วยว่าง", "No bowl to spare"],
};
/** What the wrong things taste of: how near they came to something (lib/town/cooking's tasteOf). */
const TASTE: Record<Taste, [string, string]> = {
  far: ["ไม่เข้ากันเลยสักอย่าง", "None of it goes together"], some: ["มีบางอย่างที่เข้ากันอยู่", "Some of it belongs together"],
  less: ["เกือบแล้ว ยังขาดของอีกอย่างหนึ่ง", "Nearly: one thing is missing"], more: ["เกือบแล้ว มีของเกินมาอย่างหนึ่ง", "Nearly: one thing too many"],
  swap: ["เกือบแล้ว มีของอย่างหนึ่งที่ไม่ใช่", "Nearly: one thing is not the one"], amounts: ["ของใช่ทุกอย่างแล้ว แต่สัดส่วนยังไม่ใช่", "The right things, in the wrong amounts"],
  way: ["ของครบ สัดส่วนก็ใช่ แต่วิธีทำยังไม่ใช่", "Everything is right but the way it was cooked"],
};
type Offer = "cook" | "down" | "ladle" | "take";
const VERB: Record<Offer, [string, string]> = {
  cook: ["ทำอาหาร", "Cook"], down: ["วางหม้อ", "Set the pot down"], ladle: ["ตักใส่ถ้วย", "Ladle a helping"], take: ["เก็บหม้อ", "Take the pot"],
};

/**
 * The cooking yard, to cook in (the owner, 2026-10-03: "ช่วยทำให้ ลานทำอาหารเสร็จเลย
 * ช่วยลองเทสด้วยว่า การทำอาหาร … พร้อมที่จะเล่นได้จริง"). The rules are lib/town/cooking's.
 *
 * - At a stove, a worktable or the fire, with cookware in the hand (or, at a
 *   worktable, with bare hands): things from the bag are picked one by one
 *   and put together (never by recipe: "ทำอาหาร ต้องเลือก วัตถุดิบเอง ไม่ใช่เลือกเป้น
 *   สูตร"), stirred (the game of timing), and become a pot of a dish, or
 *   something else that is made, or an odd dish, or nothing. The others
 *   standing at the yard's places with cookware in their hands are the rest
 *   of the cooks.
 * - A pot of food held in the hand is set down where one stands; anybody
 *   beside it with a bowl ladles a helping, and the bowl goes with the helping
 *   until it is eaten; its owner takes it up again while there is food in it;
 *   its last helping out, it is gone.
 *
 * Nothing says what makes what. It also draws the pots that stand about.
 * What is kept is the keeper's (lib/town/keeper): the database's for a member,
 * the browser's trial in `next dev`'s test room.
 */
export default function TownCook({ me, keeper, called, th, here, crew, cooks: others, sfx, bottom, register, onOpen }: {
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
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 5200); return () => clearTimeout(t); }, [note]);
  const name = useCallback((id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en), [th]);
  /** What is in the air over the yard: steam, smoke, bubbles, a sparkle (the owner, 2026-10-03: "การทำอาหาร … ช่วยใช้ vfx ที่เหมาะสมด้วยนะครับ ตอนนี้เหมือน ตกปลาเลย"). */
  const vfx = useMemo(() => new Vfx(), []);
  const say = useCallback((why: string) => { const w = WHY_COOK[why] ?? WHY[why as keyof typeof WHY]; setNote(w ? (th ? w[0] : w[1]) : null); }, [th]);

  // The pots that stand about, drawn among everything else on the map.
  const pots = keeper.pots(), potsRef = useRef<Pot[]>(pots);
  potsRef.current = pots;
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
  const atPlace = here?.place === "stove" || here?.place === "table" || here?.place === "fire";
  const offers: Offer[] = [];
  if (here) {
    if (atPlace && (isCookware(hand) || here.place === "table")) offers.push("cook");
    if (hand === "potFull") offers.push("down");
    if (near && near.left > 0) offers.push("ladle");
    if (near && mayTake(near, me)) offers.push("take");
  }

  /* ── cooking ── */
  const [open, setOpen] = useState(false);
  const [things, setThings] = useState<Array<[ItemId, number]>>([]);
  const [stirring, setStirring] = useState<{ things: Array<[ItemId, number]>; crew: Array<ItemId | null> } | null>(null);
  const cooks = useMemo((): Array<ItemId | null> => [hand, ...crew.map((c) => (c in ITEMS ? (c as ItemId) : null))], [hand, crew]);
  // walking off, or the place going, shuts it
  useEffect(() => { if (!atPlace) { setOpen(false); setStirring(null); } }, [atPlace]);
  useEffect(() => { onOpen?.(open); }, [open, onOpen]);
  const count = (id: ItemId) => things.find(([t]) => t === id)?.[1] ?? 0;
  const add = (id: ItemId) => setThings((was) => {
    const have = was.find(([t]) => t === id);
    if ((have?.[1] ?? 0) >= held(purse.bag, id) || (!have && was.length >= COOKING.kinds)) return was;
    return have ? was.map(([t, n]): [ItemId, number] => (t === id ? [t, n + 1] : [t, n])) : [...was, [id, 1]];
  });
  const drop = (id: ItemId) => setThings((was) => was.flatMap(([t, n]): Array<[ItemId, number]> => (t !== id ? [[t, n]] : n > 1 ? [[t, n - 1]] : [])));
  const go = useCallback(() => {
    const why = keeper.cookTry(things, cooks);
    if (why) { say(why); return; }
    setStirring({ things, crew: cooks });
  }, [keeper, things, cooks, say]);
  const finish = useCallback(async (result: TimingResult) => {
    const job = stirring;
    setStirring(null);
    if (!job) return;
    const did = await keeper.cookDo(job.things, job.crew, others, { hits: result.hits, misses: result.misses, secs: result.secs, need: result.need }, called);
    if (!did.ok) { say(did.why); return; }
    // (a recipe's dish is a go won; the odd dish, and nothing, are not)
    const right = isFind(did.made);
    keeper.record({ game: "cooking", at: keeper.now(), won: right, secs: result.secs, spent: isSpent(purse, now), buff: null, what: did.made ?? "nothing", need: result.need, hits: result.hits, misses: result.misses });
    setThings([]);
    // what comes off the pot, and what it sounds like: a dish, something made, an odd dish, or nothing
    const odd = !right && !!did.made, cooked = right && did.made! in DISHES;
    sfx?.wake();
    sfx?.work(cooked ? "cooked" : right ? "made" : odd ? "odd" : "nothing");
    vfx.add(right ? "sparkle" : odd ? "smoke" : "dust", null, { lift: 20 });
    if (cooked) vfx.add("steam", null, { lift: 22 });
    if (did.made) vfx.add("pop", null, { icon: did.made, lift: 24 });
    // (what is no recipe's is tasted: how near it was to something)
    const taste = did.taste ? ` · ${th ? TASTE[did.taste][0] : TASTE[did.taste][1]}` : "";
    if (!did.made) { setNote(`${th ? "ไม่ได้อะไรเลย" : "Nothing came of it"}${taste}`); return; }
    const dish = did.made in DISHES;
    setNote(`${did.first ? (th ? "พบสูตรใหม่! " : "A new recipe! ") : ""}${name(did.made)} ${dish ? (th ? `· ${did.n} ที่` : `· ${did.n} helpings`) : `×${did.n}`}${taste}`);
    if (dish) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the purse and the clock are read when the dish is done
  }, [stirring, keeper, others, th, sfx, name, say, called, vfx]);

  /* ── pots ── */
  const act = useCallback(async (offer: Offer) => {
    if (offer === "cook") { setOpen(true); return; }
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
      places: () => KITCHEN.places, floor: () => KITCHEN.floor, note: () => note,
    };
    (window as unknown as { __townCook?: typeof handle }).__townCook = handle;
    return () => { delete (window as unknown as { __townCook?: typeof handle }).__townCook; };
  });

  const spent = isSpent(purse, now);
  const stuff = open ? purse.bag.flatMap((s) => (s && goesIn(s.item) ? [s.item] : [])).filter((id, i, all) => all.indexOf(id) === i) : [];
  if (!open && !stirring && !offers.length && !note) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-2" style={{ bottom }}>
      {note && <p className="pop-in rounded-full bg-bg/85 px-4 py-1.5 text-ui text-ink shadow-lg shadow-black/30 backdrop-blur-sm" data-state="open" aria-live="polite">{note}</p>}
      {stirring ? (
        <div className="pop-in pointer-events-auto w-full max-w-[26rem]" data-state="open">
          <TownTiming th={th} title={th ? "ทำอาหาร" : "Cooking"} verb={th ? "คน" : "Stir"} need={stirsFor(stirring.things)} mods={{ tool: easeOf(purse.bag), spent }} look="stir"
                      onHit={(hit) => { sfx?.wake(); sfx?.work(hit ? "stir" : "clang"); if (hit) vfx.add("steam", null, { lift: 22 }); }}
                      onDone={finish} onCancel={() => setStirring(null)} />
        </div>
      ) : open ? (
        <section aria-label={th ? "ทำอาหาร" : "Cooking"} className="pop-in pointer-events-auto w-full max-w-[30rem] rounded-2xl border border-line-lit bg-surface/97 px-4 pb-3 pt-3 shadow-xl shadow-black/40 backdrop-blur-sm" data-state="open">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-title font-semibold text-ink">{th ? "ทำอาหาร" : "Cooking"}</h2>
            {/* who cooks: what each holds */}
            <span className="ml-1 flex items-center gap-1" aria-label={th ? "คนทำ" : "Cooks"}>
              {cooks.map((c, i) => (
                <span key={i} className={`grid size-8 place-items-center rounded-full border ${i ? "border-line-strong bg-bg/40" : "border-gold/70 bg-gold/10"}`}>
                  {c ? <ItemIcon id={c} size={20} /> : <TownIcon name="hand" size={18} />}
                </span>
              ))}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="pressable -mr-1 ml-auto rounded-full px-3 py-1.5 text-meta text-muted hover:text-ink">{th ? "ปิด" : "Close"}</button>
          </div>
          {/* what has been put in: a tap takes one back out */}
          <ul className="mt-2 flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-bg/40 px-2 py-1.5" aria-label={th ? "ของที่ใส่" : "What is in"}>
            {things.map(([id, n]) => (
              <li key={id}>
                <button type="button" onClick={() => drop(id)} aria-label={`${name(id)} ×${n}`}
                        className="pressable flex min-h-9 items-center gap-1 rounded-full border border-line-strong bg-card/70 pl-1.5 pr-2.5 text-ui text-ink hover:border-chili">
                  <ItemIcon id={id} size={22} /><span className="font-data tabular-nums">×{n}</span>
                </button>
              </li>
            ))}
          </ul>
          {/* what the bag has that can go in: a tap puts one in */}
          <ul className="mt-2 grid max-h-[9.5rem] grid-cols-6 gap-1.5 overflow-y-auto pr-0.5" aria-label={th ? "ของในกระเป๋า" : "In the bag"}>
            {stuff.map((id) => {
              const left = held(purse.bag, id) - count(id);
              return (
                <li key={id}>
                  <button type="button" disabled={left < 1} onClick={() => add(id)} aria-label={`${name(id)} ×${left}`} title={name(id)}
                          className="pressable relative grid aspect-square w-full place-items-center rounded-xl border-2 border-[#6b4a2a] bg-[#33251a] disabled:opacity-35">
                    <ItemIcon id={id} size={30} />
                    <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000]">{left}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" disabled={!things.length} onClick={go}
                  className="pressable mt-2 min-h-12 w-full rounded-2xl bg-accent text-read font-semibold text-bg disabled:opacity-40">
            {th ? "ลงมือทำ" : "Make it"}
          </button>
        </section>
      ) : (
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
  );
}
