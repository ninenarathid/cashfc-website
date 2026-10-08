"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fits } from "@/lib/town/box";
import { WATER } from "@/lib/town/farm";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { Sprite } from "@/lib/town/scenery";
import type { FishSfx } from "@/lib/town/sfx";
import type { Stack } from "@/lib/town/trade";
import TownIcon from "./TownIcon";
import TownFoot from "./TownFoot";
import { ItemCard, Pic, StackIcon, WHY, forgeWords, holdsOf } from "./TownTrade";

/** Why something was not done at the box, in a few words (what a bag refuses for is TownTrade's to word). */
const WHY_BOX: Record<string, [th: string, en: string]> = {
  packed: ["กล่องเต็ม", "The box is full"],
  far: ["ต้องยืนใกล้กล่อง", "Stand by the box"],
};
/** How many of a stack a tap moves: all of it, half of it (the bigger half), or one. */
type Step = "all" | "half" | "one";
const STEPS: Array<[Step, [th: string, en: string]]> = [["all", ["ทั้งหมด", "All"]], ["half", ["ครึ่ง", "Half"]], ["one", ["1 ชิ้น", "One"]]];
const stepOf = (step: Step, have: number) => (step === "all" ? have : step === "half" ? Math.ceil(have / 2) : 1);

/**
 * The storage box in the plaza (lib/town/box; the owner, 2026-10-05: "ช่วยทำ
 * กล่องเก็บของ มาตั้งไว้กลางเมือง เก็บได้ฟรี 10 ชิ้น อัพเกรดได้ในอนาคต"). Standing by
 * the chest, a small chip offers it; a tap on the chest itself walks up to it
 * and opens it. Opened, it shows what I keep in it over what is in my bag: a
 * tap on a thing moves it across, all of the stack, half of it or one, as
 * chosen at the panel's head, and never more than there is room for.
 *
 * What is in a box is its owner's alone: nobody else is told of it. How many
 * slots it has is what the keeper says (ten for nothing; a box that has been
 * given more shows them).
 *
 * What is kept is the keeper's: for a member the database's (v134), in `next
 * dev`'s test room the browser's trial. A keeper that knows of no box (the
 * database before v134) offers none, and the chest is only a chest.
 */
export default function TownBox({ keeper, th, at, ask, phone, tabbar, bottom, art, sfx, onShown }: {
  keeper: Keeper;
  th: boolean;
  /** The tile I stand on, while I stand by the box and nothing else is open over the map; null otherwise. */
  at: [number, number] | null;
  /** Goes up each time the chest was tapped and I have come to it: the panel opens. */
  ask: number;
  phone: boolean;
  tabbar: boolean;
  /** How far up from the foot of the map the chip sits. */
  bottom: string;
  /** The town's own pixel art for a picture's name, once the scenery has come. */
  art: (name: string) => Sprite | null;
  sfx: FishSfx | null;
  /** Told when the panel opens and shuts: the map draws the chest with its lid up while it is open. */
  onShown: (open: boolean) => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("all");
  const [said, setSaid] = useState<string | null>(null);
  const busy = useRef(false);
  const here = !!at, hereNow = useRef(here);
  // read as I come to the box, and again as it is opened; walking off (or anything else opening) shuts it
  useEffect(() => { hereNow.current = here; if (here) void keeper.boxLook(); else setOpen(false); }, [here, keeper]);
  useEffect(() => { if (open) { setSaid(null); void keeper.boxLook(); } }, [open, keeper]);
  // (the chest was tapped: open as soon as I am there)
  useEffect(() => { if (ask > 0 && hereNow.current) setOpen(true); }, [ask]);
  useEffect(() => { onShown(open && here); }, [open, here, onShown]);
  useEffect(() => () => onShown(false), [onShown]);
  useEffect(() => {
    if (!open) return;
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setOpen(false); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open]);

  const box = keeper.box(), purse = keeper.purse();
  const name = useCallback((id: ItemId) => (id in ITEMS ? (th ? ITEMS[id].name.th : ITEMS[id].name.en) : id), [th]);
  /** Move what is in a slot across: out of my bag into the box, or out of the box into my bag. So many as the step says, and no more than fit. */
  const move = useCallback(async (from: "bag" | "box", slot: number) => {
    const kept = keeper.box(), mine = keeper.purse(), tile = at;
    const s = from === "bag" ? mine.bag[slot] : kept?.things[slot];
    if (!kept || !s || !tile || busy.current) return;
    const into = from === "bag" ? kept.things : mine.bag;
    // (a thing this page was built before cannot be measured here: the keeper is asked, and says)
    const n = Math.min(stepOf(step, s.n), s.item in ITEMS ? fits(into, s) : s.n);
    if (n < 1) { setSaid(from === "bag" ? WHY_BOX.packed[th ? 0 : 1] : WHY.full[th ? 0 : 1]); return; }
    busy.current = true;
    const did = await (from === "bag" ? keeper.boxPut(slot, n, tile) : keeper.boxTake(slot, n, tile));
    busy.current = false;
    if (!did.ok) { const w = WHY_BOX[did.why] ?? WHY[did.why as keyof typeof WHY] ?? WHY.none; setSaid(th ? w[0] : w[1]); return; }
    sfx?.wake();
    sfx?.work("pick");
    const what = `${name(did.item)}${did.n > 1 ? ` ×${did.n}` : ""}`;
    setSaid(from === "bag" ? (th ? `เก็บ ${what} เข้ากล่องแล้ว` : `Put away: ${what}`) : (th ? `หยิบ ${what} ใส่กระเป๋าแล้ว` : `Taken out: ${what}`));
  }, [keeper, at, step, th, sfx, name]);

  // (for scripts in `next dev`: the box as it is kept, opening and shutting it, and moving a slot's things across)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const handle = { box: () => keeper.box(), open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open, step: (s: Step) => setStep(s), move, here: () => at };
    (window as unknown as { __townBox?: typeof handle }).__townBox = handle;
    return () => { delete (window as unknown as { __townBox?: typeof handle }).__townBox; };
  }, [keeper, open, move, at]);

  if (!at || !box) return null;
  const inBox = box.things.filter(Boolean).length, inBag = purse.bag.filter(Boolean).length;
  const title = th ? "กล่องเก็บของ" : "Storage box";
  return (
    <>
      {!open && (
        <TownFoot rank="chip" order={36}>
          <button type="button" onClick={() => setOpen(true)} data-box-chip data-state="open"
                  className="pop-in pressable pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-line-lit bg-surface/95 pl-3 pr-4 text-ui font-semibold text-ink shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-accent">
            <Pic sprite={art("storebox")} box={24} />
            {title}
            <span className="font-data tabular-nums text-muted">{inBox} / {box.things.length}</span>
          </button>
        </TownFoot>
      )}
      {open && (
        <div className={`pop-in absolute z-20 overflow-hidden border border-line-lit bg-surface/97 shadow-xl shadow-black/40 backdrop-blur-sm ${phone
               ? "inset-x-0 h-[min(84%,42rem)] rounded-t-2xl"
               : "right-3 top-16 w-[24rem] rounded-2xl"}`}
             style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }}
             data-state="open" data-box-panel>
          <section aria-labelledby="town-box-h" className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Pic sprite={art("storeboxOpen") ?? art("storebox")} box={30} />
              <h2 id="town-box-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{title}</h2>
              <button type="button" onClick={() => setOpen(false)} data-box-close
                      className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">
                {th ? "ปิด" : "Close"}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              {/* how many of a stack a tap moves */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span id="town-box-step" className="mr-1 text-meta text-muted">{th ? "ย้ายครั้งละ" : "A tap moves"}</span>
                <div role="radiogroup" aria-labelledby="town-box-step" className="flex gap-1.5">
                  {STEPS.map(([s, label]) => (
                    <button key={s} type="button" role="radio" aria-checked={step === s} onClick={() => setStep(s)} data-box-step={s}
                            className={`pressable min-h-9 rounded-full border px-3 text-meta ${step === s ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-muted hover:text-ink"}`}>
                      {th ? label[0] : label[1]}
                    </button>
                  ))}
                </div>
              </div>
              {/* what came of the last tap; until there has been one, how the panel is worked (not a rule of the game's: only where to press) */}
              <p className={`mt-2 min-h-[1.6em] text-meta leading-relaxed ${said ? "text-accent" : "text-muted"}`} aria-live="polite" data-box-said>
                {said ?? (th ? "แตะของเพื่อย้ายระหว่างกระเป๋ากับกล่อง" : "Tap a thing to move it between your bag and the box")}
              </p>

              {/* the chest: planks and iron, and what I keep in it */}
              <div className="relative mt-1 rounded-2xl border-2 border-[#22262c] bg-gradient-to-b from-[#8a5a2b] to-[#6e4420] p-2 shadow-lg shadow-black/40" data-box-things>
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-[18%] w-2 border-x border-[#22262c] bg-[#5b6068]" />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 right-[18%] w-2 border-x border-[#22262c] bg-[#5b6068]" />
                <div className="relative rounded-xl border-2 border-[#2e1c0c] bg-[#1d140c] px-2.5 pb-2.5 pt-2 shadow-[inset_0_6px_14px_rgba(0,0,0,0.75)]">
                  <p className="mb-2 flex items-center justify-between font-data text-label uppercase tracking-wider text-[#c9a877]">
                    <span>{th ? "ในกล่อง" : "In the box"}</span>
                    <span className="tabular-nums" data-box-count>{inBox} / {box.things.length}</span>
                  </p>
                  <Slots slots={box.things} th={th} label={th ? "ในกล่อง" : "In the box"} act={th ? "หยิบใส่กระเป๋า" : "Take out"} onPick={(i) => void move("box", i)} />
                </div>
              </div>

              {/* my bag, as it is in its own panel */}
              <div className="relative mt-3 rounded-[1.6rem] border-2 border-[#2e1c0c] bg-gradient-to-b from-[#8a5a2b] to-[#6e4420] p-2 shadow-lg shadow-black/40" data-box-bag>
                <span aria-hidden className="pointer-events-none absolute inset-1 rounded-[1.3rem] border-2 border-dashed border-[#f0d9a8]/35" />
                <div className="relative rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] px-2.5 pb-2.5 pt-2 shadow-[inset_0_6px_14px_rgba(0,0,0,0.75)]">
                  <p className="mb-2 flex items-center justify-between font-data text-label uppercase tracking-wider text-[#c9a877]">
                    <span className="flex items-center gap-1.5"><TownIcon name="bag" size={14} />{th ? "ในกระเป๋า" : "In the bag"}</span>
                    <span className="tabular-nums">{inBag} / {purse.bag.length}</span>
                  </p>
                  <Slots slots={purse.bag} th={th} label={th ? "ในกระเป๋า" : "In the bag"} act={th ? "เก็บเข้ากล่อง" : "Put away"} onPick={(i) => void move("bag", i)} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/** Some slots, five to a row: what is in each, and how many. A thing's card shows over it; a tap moves it across. */
function Slots({ slots, th, label, act, onPick }: { slots: Array<Stack | null>; th: boolean; label: string; act: string; onPick: (slot: number) => void }) {
  return (
    <ul className="grid grid-cols-5 gap-1.5" aria-label={label}>
      {slots.map((s, i) => {
        const look = `relative grid aspect-square w-full place-items-center rounded-xl border-2 ${s
          ? "border-[#6b4a2a] bg-[#33251a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)] hover:border-[#c9a877]"
          : "border-dashed border-[#4a341f] bg-[#241a10] shadow-[inset_0_3px_6px_rgba(0,0,0,0.5)]"}`;
        if (!s) return <li key={i} className={look}><span className="sr-only">{th ? "ช่องว่าง" : "Empty slot"}</span></li>;
        // (a thing this page was built before has no picture or name here: it is shown as something, and moves all the same)
        const known = s.item in ITEMS, carries = known ? forgeWords(s, th) : "", name = `${known ? (th ? ITEMS[s.item].name.th : ITEMS[s.item].name.en) : s.item}${carries ? ` ${carries}` : ""}`;
        return (
          <li key={i} className="relative hover:z-20 focus-within:z-20">
            <button type="button" onClick={() => onPick(i)} aria-label={`${act}: ${name} ×${s.n}`} data-slot={i} data-item={s.item} data-n={s.n} className={`group pressable ${look}`}>
              {known ? <StackIcon stack={s} size={36} /> : <TownIcon name="mystery" size={30} />}
              {known && ITEMS[s.item].stack > 1 && <span className="absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000,0_0_2px_#000]">{s.n}</span>}
              {known && (s.of || (s.water !== undefined && !(s.item in WATER.buckets))) && (
                <span className={`absolute bottom-0 right-1 font-data text-meta font-semibold tabular-nums [text-shadow:0_1px_2px_#000,0_0_2px_#000] ${s.of ? "text-[#f3e3c3]" : "text-[#8fd0ff]"}`}>{s.of ? s.of.left : s.water}</span>
              )}
              {known && <ItemCard id={s.item} n={s.n} th={th} at={((i % 5) + 0.5) / 5} holds={holdsOf(s, th)} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
