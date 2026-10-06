"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cureWords } from "@/lib/town/farm";
import { toldOf, type Hidden } from "@/lib/town/hints";
import { WISH } from "@/lib/town/fountain";
import { DISHES, ITEMS, MAKES, type DishId, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon } from "./TownTrade";

/** How long the paper takes to unroll, and to roll up again, in milliseconds. */
const UNROLL_MS = 560, ROLL_MS = 380;
/** The paper, its shaded edges, its ink, and the rods' wood. */
const PAPER = "#f0dfb6", PAPER_EDGE = "#d9bf85", INK = "#4a3520", INK_SOFT = "#7a5f3c", WOOD = "#8a5a2c", WOOD_DARK = "#5c3a1a", WOOD_LIGHT = "#b98346";

/**
 * A recipe written on a scroll, unrolled to be read (the owner, 2026-10-03:
 * "ช่วยทำ UI เปิดม้วนกระดาษอ่านแบบดีๆให้หน่อย สำหรับอ่านสูตรอาหาร"). Two wooden rods
 * part and the paper between them unrolls; on it, the dish, what goes into it
 * and in what, how many it feeds, and what eating it gives. Closing it rolls
 * it up again. A tap outside it, the button or Escape closes it.
 *
 * It shows a recipe as a found recipe is told (lib/town/hints; the owner:
 * "สูตรที่มีให้เจอ จะบอกแค่เกือบหมด เหลือชิ้นสุดท้ายจะบอกแค่ชนิดของ ไอเทมนั้น ต้องไปเดากันเอง"):
 * all of it but its last thing, which is never named: a card of its own
 * says which sort of thing it is and where such a thing is had, then what it
 * looks like and at last its shadow, as the recipe is missed by it (`Secret`;
 * the owner, 2026-10-06: "อยากให้ใบ้ง่ายขึ้น … อยากให้ใบ้เพิ่มทุกเมนู"). Whoever has
 * made the thing reads all of it. Under its name, who found it first: the one
 * to ask. With reduced motion the paper is simply there.
 */
export default function TownScroll({ dish, keeper, th, reduced, onClose }: {
  /** What the recipe is of: a dish, or something else that is made. */
  dish: ItemId;
  /** Who keeps what the reader has found and made. */
  keeper: Keeper;
  th: boolean;
  reduced: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(reduced);
  const closing = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOpen(true));
    button.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(t);
  }, []);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (reduced) { onClose(); return; }
    setOpen(false);
    setTimeout(onClose, ROLL_MS);
  }, [onClose, reduced]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "Enter") return;
      e.preventDefault(); e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close]);

  const d = dish in DISHES ? DISHES[dish as DishId] : null, it = ITEMS[dish];
  const by = keeper.finder(dish), does = cureWords(dish);
  const recipe = d?.recipe || MAKES[dish] ? toldOf(dish, keeper.madeBefore(dish), keeper.triesAt(dish)) : undefined;
  const name = (id: keyof typeof ITEMS) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const ms = open ? UNROLL_MS : ROLL_MS;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-black/55 px-3 py-4 backdrop-blur-[2px]" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="town-scroll-h" className="w-full max-w-[22rem]" onClick={(e) => e.stopPropagation()}>
        <Rod />
        {/* the paper: it unrolls between the rods */}
        <div className="mx-3 grid" style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: reduced ? "none" : `grid-template-rows ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)` }}>
          <div className="min-h-0 overflow-hidden">
            <div className="relative px-5 pb-5 pt-4"
                 style={{
                   color: INK,
                   backgroundColor: PAPER,
                   backgroundImage: `radial-gradient(ellipse at 18% 12%, rgba(140,100,40,0.16), transparent 42%), radial-gradient(ellipse at 84% 78%, rgba(140,100,40,0.14), transparent 46%), linear-gradient(90deg, ${PAPER_EDGE} 0, transparent 9%, transparent 91%, ${PAPER_EDGE} 100%)`,
                   boxShadow: `inset 0 10px 10px -8px rgba(60,35,10,0.45), inset 0 -10px 10px -8px rgba(60,35,10,0.45)`,
                 }}>
              <div style={{ opacity: open ? 1 : 0, transition: reduced ? "none" : `opacity 260ms ease ${open ? UNROLL_MS * 0.45 : 0}ms` }}>
                <p className="text-center font-data text-label uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{th ? "สูตรอาหาร" : "Recipe"}</p>
                <div className="mt-1 flex flex-col items-center">
                  <ItemIcon id={dish} size={64} />
                  <h2 id="town-scroll-h" className="mt-1.5 text-center font-display text-title font-semibold leading-tight">{name(dish)}</h2>
                  <p className="text-center text-meta" style={{ color: INK_SOFT }}>{th ? it.name.en : it.name.th}</p>
                  {by && (
                    <p className="mt-1 flex items-center gap-1 text-center text-meta" style={{ color: INK_SOFT }}>
                      <TownIcon name="rosette" size={16} />{th ? `คนแรกที่ทำได้: ${by}` : `First made by ${by}`}
                    </p>
                  )}
                </div>
                <Rule />

                {recipe ? (
                  <>
                    <h3 className="font-data text-label uppercase tracking-wider" style={{ color: INK_SOFT }}>{th ? "ของที่ใช้" : "What goes in"}</h3>
                    <ul className="mt-1 flex flex-col gap-1">
                      {recipe.needs.map(([id, n]) => (
                        <li key={id} className="flex items-center gap-2 text-ui">
                          <ItemIcon id={id} size={24} className="shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-semibold">{name(id)}</span>
                          <span className="font-data tabular-nums">×{n}</span>
                        </li>
                      ))}
                      {recipe.last && <Secret hidden={recipe.last} th={th} />}
                    </ul>
                    <Rule />
                    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-ui">
                      <dt style={{ color: INK_SOFT }}>{th ? "ทำใน" : "Cooked in"}</dt>
                      <dd className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
                        {recipe.in.map((tool) => <span key={tool} className="flex items-center gap-1.5"><ItemIcon id={tool} size={22} />{name(tool)}</span>)}
                        {!recipe.in.length && <span className="flex items-center gap-1.5"><TownIcon name="hand" size={20} />{th ? "มือเปล่า ที่โต๊ะ" : "Bare hands, at a worktable"}</span>}
                      </dd>
                      <dt style={{ color: INK_SOFT }}>{th ? "ได้" : "Makes"}</dt>
                      <dd className="font-semibold">{d ? (th ? `${recipe.gives} ที่` : `${recipe.gives} helping${recipe.gives === 1 ? "" : "s"}`) : `×${recipe.gives}`}</dd>
                      {recipe.cooks > 1 && (
                        <>
                          <dt style={{ color: INK_SOFT }}>{th ? "คนทำ" : "Cooks"}</dt>
                          <dd className="font-semibold">{th ? `ต้องช่วยกัน ${recipe.cooks} คน` : `${recipe.cooks}, together`}</dd>
                        </>
                      )}
                    </dl>
                  </>
                ) : (
                  <p className="text-center text-ui">{th ? "ไม่ต้องทำเอง ลุงขายของมีขาย" : "Nothing to cook: the uncle sells it."}</p>
                )}
                {/* a cure that keeps pests off afterwards says what it does (the owner, 2026-10-06): the one made thing that does */}
                {does && <Rule />}
                {does && <h3 className="font-data text-label uppercase tracking-wider" style={{ color: INK_SOFT }}>{th ? "สรรพคุณ" : "What it does"}</h3>}
                {does && <p className="mt-1 text-ui font-semibold" data-scroll-does>{th ? does.th : does.en}</p>}
                {d && <Rule />}
                {d && <h3 className="font-data text-label uppercase tracking-wider" style={{ color: INK_SOFT }}>{th ? "กินแล้วได้" : "Eating it gives"}</h3>}
                {d && <p className="mt-1 flex items-center gap-1.5 text-ui font-semibold"><TownIcon name="stamina" size={18} />Stamina +{d.stamina}</p>}
                {d?.buff && (
                  <p className="mt-1 flex items-start gap-1.5 text-ui">
                    <TownIcon name={WISH[d.buff].icon as IconName} size={20} className="mt-0.5" />
                    <span><span className="font-semibold">{th ? WISH[d.buff].name.th : WISH[d.buff].name.en}</span>{" "}
                      <span style={{ color: INK_SOFT }}>{th ? WISH[d.buff].about.th : WISH[d.buff].about.en}</span></span>
                  </p>
                )}

                <div className="mt-4 flex justify-center">
                  <button ref={button} type="button" onClick={close}
                          className="pressable min-h-11 rounded-full px-6 text-ui font-semibold"
                          style={{ backgroundColor: INK, color: PAPER }}>
                    {th ? "ม้วนเก็บ" : "Roll it up"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Rod />
      </div>
    </div>
  );
}

/**
 * The thing a recipe will not name, on a slip of its own: which sort of thing it is and where such a thing is had,
 * always; what it looks like once the recipe has been missed by it; and its shadow in the place of the question
 * mark after more such misses (lib/town/hints' `Hidden`). Three small marks at its foot are filled as it says
 * more. Never its name: that is for whoever has made the dish, the one to ask.
 */
export function Secret({ hidden, th }: { hidden: Hidden; th: boolean }) {
  const said = 1 + (hidden.looks ? 1 : 0) + (hidden.shadow ? 1 : 0);
  const label = `font-data text-label ${th ? "" : "uppercase tracking-wider"}`;
  return (
    <li className="mt-1.5 rounded-lg px-2.5 pb-2 pt-2" data-secret={said}
        style={{ border: `1.5px dashed ${INK_SOFT}`, backgroundColor: "rgba(120, 85, 35, 0.1)" }}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-md" data-secret-shadow={hidden.shadow ? "" : undefined}
              style={{ backgroundColor: "rgba(74, 53, 32, 0.13)", boxShadow: `inset 0 0 0 1px ${PAPER_EDGE}` }}>
          {hidden.shadow
            ? <ItemIcon id={hidden.shadow} size={32} className="opacity-85 [filter:brightness(0)]" />
            : <TownIcon name="mystery" size={26} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={label} style={{ color: INK_SOFT }}>{th ? "ชิ้นลับ" : "The secret thing"}</p>
          <p className="text-ui font-semibold leading-snug">{th ? hidden.sort.th : hidden.sort.en[0].toUpperCase() + hidden.sort.en.slice(1)}</p>
        </div>
        <span className="self-start font-data text-ui tabular-nums">×{hidden.n}</span>
      </div>
      {(hidden.from || hidden.looks) && (
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-meta leading-snug">
          {hidden.from && <><dt style={{ color: INK_SOFT }}>{th ? "เบาะแส" : "Clue"}</dt><dd>{th ? hidden.from.th : hidden.from.en}</dd></>}
          {/* once the recipe has been missed by this thing alone: what it looks like, never its name */}
          {hidden.looks && <><dt style={{ color: INK_SOFT }}>{th ? "หน้าตา" : "Looks"}</dt><dd>{th ? hidden.looks.th : hidden.looks.en}</dd></>}
        </dl>
      )}
      <p className="mt-1.5 flex items-center justify-end gap-1.5" role="img" aria-label={th ? `คำใบ้ ${said} จาก 3` : `${said} of 3 clues`}>
        {[0, 1, 2].map((i) => (
          <span key={i} aria-hidden className="size-1.5 rotate-45" style={{ backgroundColor: i < said ? INK : "transparent", boxShadow: `0 0 0 1px ${INK_SOFT}` }} />
        ))}
      </p>
    </li>
  );
}

/** One of the scroll's two wooden rods, with a knob at each end. */
function Rod() {
  const knob = { background: `linear-gradient(180deg, ${WOOD_LIGHT}, ${WOOD} 45%, ${WOOD_DARK})`, boxShadow: `0 0 0 2px ${WOOD_DARK}` } as const;
  return (
    <div aria-hidden className="relative z-10 flex items-center">
      <span className="size-4 shrink-0 rounded-sm" style={knob} />
      <span className="h-3.5 flex-1" style={{ background: `linear-gradient(180deg, ${WOOD_LIGHT}, ${WOOD} 40%, ${WOOD_DARK})`, boxShadow: `0 0 0 2px ${WOOD_DARK}, 0 4px 6px rgba(0,0,0,0.35)` }} />
      <span className="size-4 shrink-0 rounded-sm" style={knob} />
    </div>
  );
}

/** A line across the paper, a little flourish in its middle. */
function Rule() {
  return (
    <div aria-hidden className="my-3 flex items-center gap-2" style={{ color: INK_SOFT }}>
      <span className="h-px flex-1" style={{ backgroundColor: "currentColor", opacity: 0.5 }} />
      <span className="size-1.5 rotate-45" style={{ backgroundColor: "currentColor" }} />
      <span className="h-px flex-1" style={{ backgroundColor: "currentColor", opacity: 0.5 }} />
    </div>
  );
}
