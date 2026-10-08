"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  SMITH, candidates, gemsIn, maySmelt, owedOf, pendingSlot, smeltCost, smithView, timberFor, dryOf, toolsIn, tryCost, tryLacks, tryOdds, widerCost,
  type Outcome, type SmithRefusal, type Smelting,
} from "@/lib/town/forge";
import { ITEMS, type ItemId } from "@/lib/town/items";
import type { Keeper } from "@/lib/town/keeper";
import type { FishSfx } from "@/lib/town/sfx";
import ART from "@/lib/town/smith-art.json";
import { gemDoes, optionDoes } from "@/lib/town/tool-words";
import {
  BUILT, FORGE, GEMS, OPTIONS, OPTION_IDS, SMELTS, TOOL_KINDS, drawnOf, gemsOf, modsOf, settable,
  type OptionId, type ToolKind,
} from "@/lib/town/tools";
import { held } from "@/lib/town/trade";
import TownIcon, { type IconName } from "./TownIcon";
import { Coins, ItemIcon } from "./TownTrade";

/** The smith's four leaves. */
export type SmithView = "smelt" | "forge" | "gems" | "board";
export const SMITH_VIEWS: SmithView[] = ["smelt", "forge", "gems", "board"];
export const isSmithView = (v: unknown): v is SmithView => typeof v === "string" && (SMITH_VIEWS as string[]).includes(v);
const VIEW_WORD: Record<SmithView, [th: string, en: string]> = { smelt: ["หลอมแร่", "Smelt"], forge: ["ตีบวก", "Forge"], gems: ["ฝังพลอย", "Gems"], board: ["กระดาน", "Board"] };
/**
 * What the smith's talk offers, for whoever builds his talk (as the uncle's and the banker's choices are built in
 * Town.tsx's openTalk): a choice for each leaf of this screen, the smelting's with how many pieces wait to be taken.
 * Nothing, where whoever keeps the game has no smith (`keeper.smith()` is null).
 */
export function smithChoices(keeper: Keeper | null, th: boolean): Array<{ id: SmithView; label: string; note?: string }> {
  const told = keeper?.smith() ?? null;
  if (!keeper || !told) return [];
  const done = smithView(told.smithy, keeper.now()).done.length;
  return SMITH_VIEWS.map((id) => ({ id, label: th ? VIEW_WORD[id][0] : VIEW_WORD[id][1], ...(id === "smelt" && done > 0 ? { note: String(done) } : {}) }));
}

/** Why something was not done at the smith, in a few words. */
const WHY: Record<SmithRefusal, [th: string, en: string]> = {
  none: ["ไม่มีสิ่งนั้นแล้ว", "It is not there any more"],
  amount: ["จำนวนไม่ถูกต้อง", "Not a number that can be done"],
  tool: ["เครื่องมือชิ้นนี้ตีบวกไม่ได้", "This is no tool that can be forged"],
  top: ["ถึงขั้นสูงสุดแล้ว", "It is at the top already"],
  ore: ["แร่ไม่พอ", "Not enough ore"],
  timber: ["ไม้เนื้อดีไม่พอ", "Not enough fine timber"],
  coins: ["Popoto coin ไม่พอ", "Not enough Popoto coins"],
  places: ["ที่หลอมเต็มแล้ว", "The queue is full"],
  full: ["กระเป๋าเต็ม", "The bag is full"],
  gem: ["ไม่มีพลอยเม็ดนั้นในกระเป๋า", "That gem is not in the bag"],
  same: ["เครื่องมือชิ้นนี้ฝังพลอยธาตุนี้อยู่แล้ว", "That element is set in it already"],
  unbuilt: ["ช่างยังทำอย่างนั้นกับเครื่องมือชิ้นนี้ไม่ได้", "The smith cannot do that for this tool yet"],
  owed: ["ต้องเลือกออปชันที่รออยู่ก่อน", "Choose the option that waits first"],
  asleep: ["ออปชันนี้หลับอยู่", "That option is asleep"],
  self: ["สูบลมให้เตาของตัวเองไม่ได้", "Not one's own bellows"],
  idle: ["ตอนนี้ไม่มีอะไรหลอมอยู่", "Nothing is smelting there now"],
  tired: ["ชั่วโมงนี้ช่วยเตานี้ครบแล้ว", "You have helped that fire all you may this hour"],
  away: ["ติดต่อสมุดของเมืองไม่ได้ ลองใหม่อีกครั้ง", "The town's books could not be reached. Try again."],
};
const KIND_WORD: Record<ToolKind, [th: string, en: string]> = {
  pick: ["อีเต้อ", "Pickaxe"], axe: ["ขวาน", "Axe"], rod: ["คันเบ็ด", "Rod"], hoe: ["จอบ", "Hoe"], can: ["บัวรดน้ำ", "Watering can"],
  bugNet: ["สวิงจับแมลง", "Insect net"], pot: ["หม้อ", "Pot"], pan: ["กระทะ", "Pan"], grill: ["เตาปิ้ง", "Grill"],
};
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const itemName = (id: ItemId, th: boolean) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);

/** The scene's window: how much of the picture's height the band shows, and from where; and where the anvil's top and the furnace's mouth are in the band. */
const BAND = { w: 128, h: 58, top: 0.32 };
const FRAC = BAND.h / ART.size[1], START = (1 - FRAC) * BAND.top;
const spot = (at: number[]) => ({ left: `${at[0] * 100}%`, top: `${((at[1] - START) / FRAC) * 100}%` });

/**
 * The blacksmith's screen (lib/town/forge; 2026-10-08, with woodcutting and mining). Four leaves on one board, under
 * a picture of his forge: smelting (what the bag can smelt, the queue with its countdowns, what waits to be taken, a
 * friend's fire to blow on), forging (the tool on the anvil, what the next try takes, how it may go, three knocks
 * and what came of it, the two options of a draw to choose from), gems (the tool's socket, the gems held, what a
 * new one would cost and take the place of), and the board (the village's firsts).
 *
 * It shows states and refusals and never a rule: what is lacking is marked where it is lacking. What an option does
 * is said on its own card, to whoever has it laid out before them or on their tool; what a gem does is said only on
 * the card of a tool it is set in.
 *
 * What is kept is the keeper's: for a member the database's, in `next dev`'s test room the browser's trial. A keeper
 * that knows of no smith offers none of this (`keeper.smith()` is null, and the map never opens this).
 */
export default function TownSmith({ keeper, th, view, onView, onClose, phone, tabbar, reduced, sfx, name, near }: {
  keeper: Keeper;
  th: boolean;
  view: SmithView;
  onView: (view: SmithView) => void;
  onClose: () => void;
  phone: boolean;
  tabbar: boolean;
  /** The town's own switch for motion: with it off, nothing here swings or pulses, and everything it says is still said. */
  reduced: boolean;
  sfx: FishSfx | null;
  /** What I am called: for the board, if I am the first. */
  name: string;
  /** Who stands by the forge with me now: their fires may be blown on. */
  near: () => Array<{ id: string; name: string }>;
}) {
  const [, setTick] = useState(0);
  useEffect(() => keeper.watch(() => setTick((n) => n + 1)), [keeper]);
  // (the countdowns: a look at the clock every second while the screen is open)
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { keeper.smithLook(); }, [keeper]);
  const t = useCallback((thai: string, en: string) => (th ? thai : en), [th]);
  const told = keeper.smith(), purse = keeper.purse(), now = keeper.now();
  const [said, setSaid] = useState<{ text: string; tone: "good" | "bad" | "plain" } | null>(null);
  const [busy, setBusy] = useState(false);
  const refuse = (why: SmithRefusal) => { setSaid({ text: th ? WHY[why][0] : WHY[why][1], tone: "bad" }); sfx?.work("nothing"); };

  // ── the tool on the anvil: the one chosen, while it is still in that slot; or else the first there is ──
  const tools = toolsIn(purse.bag);
  const [picked, setPicked] = useState<number | null>(null);
  const pending = told?.smithy.pending ?? null, waits = pendingSlot(purse, pending, picked ?? -1);
  const slot = waits >= 0 ? waits : picked !== null && tools.some((x) => x.slot === picked) ? picked : tools[0]?.slot ?? -1;
  const stack = slot >= 0 ? purse.bag[slot] : null, kind = stack ? tools.find((x) => x.slot === slot)?.kind ?? null : null;
  const mods = modsOf(stack), level = mods.level;

  // ── a try: three knocks, and what came of it ──
  const [knock, setKnock] = useState(0);
  const [came, setCame] = useState<{ out: Outcome; level: number } | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => () => { for (const x of timers.current) clearTimeout(x); }, []);
  const strike = async () => {
    if (busy || slot < 0) return;
    setBusy(true); setCame(null); setSaid(null);
    const gap = reduced ? 140 : 380;
    const knocks = new Promise<void>((done) => {
      [0, 1, 2].forEach((i) => timers.current.push(setTimeout(() => { setKnock(i + 1); sfx?.work("clang"); }, i * gap)));
      timers.current.push(setTimeout(done, 3 * gap));
    });
    const [did] = await Promise.all([keeper.smithTry(slot, name), knocks]);
    setKnock(0); setBusy(false);
    if (!did.ok) { refuse(did.why); return; }
    setCame({ out: did.out, level: did.level });
    sfx?.work(did.out === "taken" ? "made" : "nothing");
    setSaid(did.out === "taken" ? { text: t(`ตีติด! เป็น +${did.level} แล้ว`, `It took: +${did.level}`), tone: "good" }
      : did.out === "stays" ? { text: t(`ไม่ติด ระดับยังอยู่ที่ +${did.level}`, `It did not take. Still +${did.level}`), tone: "plain" }
        : { text: t(`ไม่ติด ระดับลดลงเหลือ +${did.level}`, `It did not take. Down to +${did.level}`), tone: "bad" });
  };
  // (a draw the tool is owed is laid out as soon as the tool is on the anvil: the same two, however often it is asked)
  const owed = owedOf(stack), laid = !!pending && waits === slot && slot >= 0;
  useEffect(() => {
    if (view !== "forge" || slot < 0 || owed < 0 || laid || busy) return;
    void keeper.smithDraw(slot);
  }, [view, slot, owed, laid, busy, keeper]);
  // (the options laid out are brought into sight: on a small screen they may come under its foot)
  const offerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (laid) offerRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); }, [laid, reduced]);
  const choose = async (pick: string) => {
    if (busy || slot < 0) return;
    setBusy(true);
    const did = await keeper.smithChoose(slot, pick, name);
    setBusy(false);
    if (!did.ok) { refuse(did.why); return; }
    sfx?.work("made");
    setSaid({ text: did.kept ? t("เก็บออปชันเดิมไว้", "The old option is kept") : t(`ได้ออปชัน “${OPTIONS[did.opt].name.th}”`, `It has “${OPTIONS[did.opt].name.en}” now`), tone: "good" });
  };
  // ── drawing an option again: which milestone's, and which gem pays ──
  const [again, setAgain] = useState<number | null>(null);
  const redraw = async (gem: ItemId) => {
    if (busy || slot < 0 || again === null) return;
    setBusy(true);
    const did = await keeper.smithRedraw(slot, again, gem);
    setBusy(false); setAgain(null);
    if (!did.ok) refuse(did.why);
  };
  // ── a gem: which one of the bag's is chosen ──
  const [gem, setGem] = useState<ItemId | null>(null);
  const gems = gemsIn(purse.bag), chosenGem = gem && gems.some((g) => g.gem === gem) ? gem : null;
  const setIt = async () => {
    if (busy || slot < 0 || !chosenGem) return;
    setBusy(true);
    const did = await keeper.smithGem(slot, chosenGem);
    setBusy(false);
    if (!did.ok) { refuse(did.why); return; }
    sfx?.work("clang"); setGem(null);
    setSaid({ text: t(`ฝัง${itemName(chosenGem, true)}แล้ว`, `${itemName(chosenGem, false)} is set`), tone: "good" });
  };
  // ── smelting ──
  const smeltNow = async (piece: ItemId, n: number) => {
    if (busy) return;
    setBusy(true);
    const did = await keeper.smithSmelt(piece, n);
    setBusy(false);
    if (!did.ok) { refuse(did.why); return; }
    sfx?.work("crackle"); setSaid(null);
  };
  const takeDone = async () => {
    if (busy) return;
    setBusy(true);
    const did = await keeper.smithTake();
    setBusy(false);
    if (!did.ok) { refuse(did.why); return; }
    sfx?.work("made");
    setSaid({ text: `${t("ได้", "Taken")}: ${did.got.map(([id, n]) => `${itemName(id, th)} ×${n}`).join(", ")}`, tone: "good" });
  };
  const widenNow = async () => {
    if (busy) return;
    setBusy(true);
    const did = await keeper.smithWiden();
    setBusy(false);
    if (!did.ok) refuse(did.why);
  };
  // (friends by the forge whose fire burns: asked for while the smelting's leaf is open, and again every few seconds)
  const [fires, setFires] = useState<Array<{ id: string; name: string; piece: Smelting; left: number }>>([]);
  const nearRef = useRef(near);
  useEffect(() => { nearRef.current = near; }, [near]);
  const askFires = useCallback(async () => {
    const by = nearRef.current().filter((p) => p.id !== keeper.id);
    const got = by.length ? await keeper.smithNear(by.map((p) => p.id)) : [];
    setFires(got.map((g) => ({ ...g, name: by.find((p) => p.id === g.id)?.name ?? "" })));
  }, [keeper]);
  useEffect(() => {
    if (view !== "smelt") return;
    void askFires();
    const timer = setInterval(() => void askFires(), 5000);
    return () => clearInterval(timer);
  }, [view, askFires]);
  const blow = async (whose: string) => {
    if (busy) return;
    setBusy(true);
    const did = await keeper.smithBellows(whose);
    setBusy(false);
    if (!did.ok) { refuse(did.why); return; }
    sfx?.work("gust");
    setSaid({ text: t(`สูบลมให้แล้ว เร็วขึ้น ${Math.round(did.off / 1000)} วินาที`, `The fire is blown up: ${Math.round(did.off / 1000)} s sooner`), tone: "good" });
    void askFires();
  };

  // Escape puts away what is asked first, then the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (again !== null) setAgain(null); else if (gem) setGem(null); else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [again, gem, onClose]);
  // (a leaf turned: what the last one said is put away)
  useEffect(() => { setSaid(null); setCame(null); setAgain(null); setGem(null); }, [view]);

  const cave = useMemo(() => (keeper as unknown as { caveBoard?: () => { floor: number; by: string } | null }).caveBoard, [keeper]);
  if (!told) return null;
  const q = smithView(told.smithy, now);
  const glow = mods.glow ? { filter: `drop-shadow(0 0 ${mods.glow === 2 ? 7 : 4}px ${mods.hue}) drop-shadow(0 0 ${mods.glow === 2 ? 14 : 6}px ${mods.hue}${mods.glow === 2 ? "" : "88"})` } : undefined;
  const cost = kind && level < FORGE.top ? tryCost(kind, level + 1) : null, odds = level < FORGE.top ? tryOdds(level + 1) : null, lacks = slot >= 0 ? tryLacks(purse, slot) : [];
  const setElement = stack ? gemsOf(stack)[0] ?? null : null;

  /** The tools of the bag, to put one on the anvil. */
  const rack = (
    <div className="mb-3" data-smith-rack>
      {tools.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("เครื่องมือในกระเป๋า", "The tools in the bag")}>
          {tools.map((x) => {
            const m = modsOf(x.stack), on = x.slot === slot;
            return (
              <li key={x.slot}>
                <button type="button" onClick={() => { setPicked(x.slot); setCame(null); setSaid(null); setAgain(null); }} aria-pressed={on} disabled={busy || (laid && !on)}
                        data-smith-tool={x.slot} data-item={x.stack.item} data-plus={m.level}
                        aria-label={`${itemName(x.stack.item, th)} +${m.level}`}
                        className={`pressable relative grid size-12 place-items-center rounded-xl border-2 disabled:opacity-40 ${on ? "border-[#f0c46a] bg-[#4a3423] shadow-[0_0_0_2px_rgba(240,196,106,0.25)]" : "border-[#6b4a2a] bg-[#33251a] hover:border-[#c9a877]"}`}>
                  <ItemIcon id={x.stack.item} size={30} />
                  {m.level > 0 && <span className="absolute -right-1 -top-1 rounded-full border border-[#2a190d] bg-[#f0c46a] px-1 font-data text-label font-bold leading-4 text-[#2a190d]">+{m.level}</span>}
                  {gemsOf(x.stack)[0] && <span aria-hidden className="absolute -bottom-1 -left-1 size-3 rounded-full border border-[#2a190d]" style={{ background: GEMS[gemsOf(x.stack)[0]].hue }} />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-xl border border-dashed border-[#6b4a2a] px-3 py-4 text-center text-ui text-[#c9a877]" data-smith-none>{t("ในกระเป๋าไม่มีเครื่องมือที่ตีบวกได้", "There is no tool in the bag that can be forged")}</p>}
    </div>
  );
  /** The tool's own card: its plus, its options awake and asleep, its gem. */
  const card = stack && kind && (
    <div className="rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] p-3 shadow-[inset_0_6px_14px_rgba(0,0,0,0.6)]" data-smith-card data-item={stack.item} data-plus={level}>
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 truncate font-display text-title font-semibold text-[#f3e3c3]">{itemName(stack.item, th)}</h3>
        <span className="rounded-full bg-[#f0c46a] px-2 font-data text-ui font-bold tabular-nums text-[#2a190d]" data-smith-plus>+{level}</span>
      </div>
      <ol className="mt-2 flex items-center gap-1" aria-label={t(`ระดับ ${level} จาก ${FORGE.top}`, `Level ${level} of ${FORGE.top}`)}>
        {Array.from({ length: FORGE.top }, (_, i) => {
          const mile = FORGE.milestones.includes(i + 1), on = i < level;
          return <li key={i} aria-hidden className={`${mile ? "size-3 rotate-45 rounded-[3px]" : "h-2 flex-1 rounded-full"} border ${on ? "border-[#f0c46a] bg-[#f0c46a]" : "border-[#6b4a2a] bg-[#33251a]"}`} />;
        })}
      </ol>
      <ul className="mt-3 space-y-2">
        {drawnOf(stack).map((id, i) => {
          const awake = level >= FORGE.milestones[i];
          if (!id) return level >= FORGE.milestones[i] || !BUILT[kind].opts.length ? null : (
            <li key={i} className="flex items-center gap-2 text-meta text-[#8f7655]"><TownIcon name="lock" size={12} />{t(`ออปชันขั้น +${FORGE.milestones[i]}`, `The option of +${FORGE.milestones[i]}`)}</li>
          );
          const o = OPTIONS[id], does = optionDoes(id);
          return (
            <li key={i} className={`rounded-xl border px-2.5 py-2 ${awake ? "border-[#6b4a2a] bg-[#2a1d12]" : "border-dashed border-[#4a341f] bg-[#1d140c] opacity-70"}`} data-smith-opt={id} data-awake={awake}>
              <div className="flex items-center gap-2">
                <span className="font-data text-label text-[#c9a877]">+{FORGE.milestones[i]}</span>
                <span className="min-w-0 flex-1 truncate text-ui font-semibold text-[#f3e3c3]">{th ? o.name.th : o.name.en}</span>
                {!awake && <span className="rounded-full border border-[#6b4a2a] px-2 text-label text-[#c9a877]">{t("หลับอยู่", "Asleep")}</span>}
                {awake && view === "forge" && !laid && candidates(stack, i).length > 0 && (
                  <button type="button" onClick={() => setAgain(again === i ? null : i)} disabled={busy} aria-expanded={again === i} data-smith-again={i}
                          className="pressable min-h-8 rounded-full border border-[#6b4a2a] px-2.5 text-label font-semibold text-[#c9a877] hover:border-[#c9a877] hover:text-[#f3e3c3]">{t("สุ่มใหม่", "Draw again")}</button>
                )}
              </div>
              <p className="mt-1 text-meta leading-relaxed text-[#d9c39b]">{th ? does.th : does.en}</p>
            </li>
          );
        })}
        <li className="flex items-start gap-2 rounded-xl border border-[#6b4a2a] bg-[#2a1d12] px-2.5 py-2" data-smith-gem={setElement ?? ""}>
          <span className="relative mt-0.5 grid size-7 shrink-0 place-items-center">
            <TownIcon name="smithSocket" size={26} />
            {setElement && <span className="absolute"><ItemIcon id={GEMS[setElement].gem} size={16} /></span>}
          </span>
          {setElement ? (
            <span className="min-w-0">
              <span className="block text-ui font-semibold" style={{ color: GEMS[setElement].hue }}>{itemName(GEMS[setElement].gem, th)} · {th ? GEMS[setElement].name.th : GEMS[setElement].name.en} {mods.gems[setElement]}</span>
              {(() => { const does = gemDoes(kind, setElement, mods.gems[setElement] ?? 1); return does ? <span className="block text-meta leading-relaxed text-[#d9c39b]" data-smith-gem-does>{th ? does.th : does.en}</span> : null; })()}
            </span>
          ) : <span className="self-center text-meta text-[#8f7655]">{t("ช่องพลอยว่าง", "The socket is empty")}</span>}
        </li>
      </ul>
    </div>
  );
  /** A draw's options, laid out to choose from: each on its own card. */
  const offer = laid && pending && (
    <div className="mb-3" ref={offerRef} data-smith-offer data-at={pending.at}>
      <p className="mb-2 text-center font-display text-lead font-semibold text-[#f0c46a]">{pending.old ? t("เลือกอันใหม่ หรือเก็บอันเดิม", "Take a new one, or keep the old") : t(`ถึง +${FORGE.milestones[pending.at]} แล้ว เลือกออปชันหนึ่งอย่าง`, `+${FORGE.milestones[pending.at]}: choose one option`)}</p>
      <ul className={`grid gap-2 ${pending.offer.length + (pending.old ? 1 : 0) > 2 && !phone ? "grid-cols-3" : "grid-cols-2"}`}>
        {[...pending.offer, ...(pending.old ? [pending.old] : [])].map((id, i) => <OptionCard key={id} id={id} th={th} at={FORGE.milestones[pending.at]} keep={id === pending.old} busy={busy} reduced={reduced} delay={i * 90} onPick={() => void choose(id)} />)}
      </ul>
    </div>
  );

  return (
    <div className={`pop-in absolute z-30 overflow-hidden border-2 border-[#2e1c0c] bg-[#6e4420] shadow-xl shadow-black/50 ${phone ? "inset-x-0 h-[min(92%,48rem)] rounded-t-2xl" : "right-3 top-16 w-[27rem] rounded-2xl"}`}
         style={phone ? { bottom: tabbar ? "calc(4.5rem + env(safe-area-inset-bottom))" : 0 } : { bottom: "0.75rem" }} data-state="open" data-smith-panel data-smith-view={view}>
      <style href="town-smith" precedence="medium">{`
        @keyframes sm-swing { 0% { transform: rotate(-58deg) } 55% { transform: rotate(-58deg) } 78% { transform: rotate(8deg) } 100% { transform: rotate(-24deg) } }
        @keyframes sm-spark { from { transform: translate(0, 0) scale(.5); opacity: 1 } to { transform: translate(var(--sx), var(--sy)) scale(1.1); opacity: 0 } }
        @keyframes sm-ember { 0%, 100% { opacity: .35 } 50% { opacity: .8 } }
        @keyframes sm-rise { from { transform: translateY(14px) scale(.94); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes sm-bob { 0%, 100% { transform: translate(-50%, -100%) } 50% { transform: translate(-50%, calc(-100% - 3px)) } }
        @keyframes sm-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .72 } }
        @keyframes sm-flash { from { opacity: .9 } to { opacity: 0 } }
      `}</style>
      <section aria-labelledby="town-smith-h" className="flex h-full flex-col">
        {/* the head: an iron plate riveted to the board */}
        <div className="relative flex items-center gap-2 border-b-2 border-[#16181c] bg-gradient-to-b from-[#5b6068] to-[#3d4148] px-3 py-2.5">
          {[["left-1.5 top-1.5"], ["right-1.5 top-1.5"], ["left-1.5 bottom-1.5"], ["right-1.5 bottom-1.5"]].map(([at]) => <span key={at} aria-hidden className={`absolute ${at} size-1.5 rounded-full bg-[#22262c] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`} />)}
          <TownIcon name="hammer" size={22} className="ml-2" />
          <h2 id="town-smith-h" className="min-w-0 truncate font-display text-title font-semibold text-[#f3e3c3] [text-shadow:0_1px_0_#16181c]">{t("ช่างตีเหล็ก", "The blacksmith")}</h2>
          <span className="ml-auto" data-smith-coins={purse.coins}><Coins n={purse.coins} th={th} /></span>
          <button type="button" onClick={onClose} data-smith-close className="pressable mr-2 rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">{t("ปิด", "Close")}</button>
        </div>
        {/* the leaves */}
        <div role="tablist" aria-label={t("ช่างตีเหล็ก", "The blacksmith")} className="flex gap-1 bg-[#4a2f17] px-2 pt-2">
          {SMITH_VIEWS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)} disabled={busy || (laid && v !== "forge")} data-smith-tab={v}
                    className={`pressable relative min-h-10 flex-1 rounded-t-xl border-2 border-b-0 px-1 text-ui font-semibold disabled:opacity-50 ${view === v ? "border-[#2e1c0c] bg-[#8a5a2b] text-[#f3e3c3]" : "border-transparent text-[#c9a877] hover:text-[#f3e3c3]"}`}>
              {th ? VIEW_WORD[v][0] : VIEW_WORD[v][1]}
              {v === "smelt" && q.done.length > 0 && <span className="absolute -top-1 right-1 rounded-full bg-[#f0c46a] px-1.5 font-data text-label font-bold leading-4 text-[#2a190d]" data-smith-due>{q.done.length}</span>}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-[#8a5a2b] to-[#6e4420]">
          {/* the forge itself: the furnace, the anvil with the tool on it, the hammer */}
          {view !== "board" && (
            <div className="relative w-full overflow-hidden border-b-2 border-[#2e1c0c]" style={{ aspectRatio: `${BAND.w} / ${BAND.h}` }} data-smith-scene>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ART.image} alt="" decoding="async" className="absolute inset-0 size-full object-cover" style={{ imageRendering: "pixelated", objectPosition: `50% ${BAND.top * 100}%` }} />
              {/* the fire's breath, while a piece smelts */}
              {q.now && <span aria-hidden className="absolute size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ ...spot(ART.mouth), background: "radial-gradient(closest-side, rgba(255,170,60,.55), rgba(255,120,30,0))", animation: reduced ? undefined : "sm-ember 1.6s ease-in-out infinite" }} />}
              {view === "smelt" && q.now && (
                <span className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5" style={{ ...spot([ART.mouth[0], ART.mouth[1] - 0.2]) }}>
                  <ItemIcon id={q.now.piece} size={30} />
                  <span className="rounded-full bg-black/65 px-1.5 font-data text-label font-semibold tabular-nums text-[#ffd9a0]">{clock(q.now.till - now)}</span>
                </span>
              )}
              {view !== "smelt" && stack && (
                <>
                  <span className="absolute" style={{ ...spot(ART.anvil), transform: "translate(-50%, -100%)", animation: !reduced && mods.glow === 2 ? "sm-bob 2.4s ease-in-out infinite" : undefined }} data-smith-anvil data-glow={mods.glow}>
                    <span className="block" style={glow}><ItemIcon id={stack.item} size={phone ? 52 : 62} /></span>
                  </span>
                  {level > 0 && <span className="absolute -translate-x-1/2 rounded-full border border-[#2a190d] bg-[#f0c46a] px-1.5 font-data text-meta font-bold text-[#2a190d]" style={{ ...spot([ART.anvil[0] + 0.07, ART.anvil[1] - 0.2]) }}>+{level}</span>}
                  {/* the hammer: three knocks to a try */}
                  {knock > 0 && (
                    <span key={knock} aria-hidden className="absolute origin-bottom-right" style={{ ...spot([ART.anvil[0] + 0.02, ART.anvil[1] - 0.34]), transform: "rotate(-24deg)", animation: reduced ? undefined : "sm-swing 360ms ease-in both" }}>
                      <TownIcon name="hammer" size={phone ? 40 : 46} />
                    </span>
                  )}
                  {knock > 0 && !reduced && [[-26, -22], [22, -26], [-8, -34], [30, -8]].map(([sx, sy], i) => (
                    <span key={`${knock}-${i}`} aria-hidden className="absolute" style={{ ...spot([ART.anvil[0], ART.anvil[1] - 0.1]), ["--sx" as string]: `${sx}px`, ["--sy" as string]: `${sy}px`, animation: "sm-spark 320ms ease-out 200ms both", opacity: 0 }}>
                      <TownIcon name={(`fxSpark${(i % 4) + 1}`) as IconName} size={12} />
                    </span>
                  ))}
                  {came && <span key={`${came.out}-${came.level}`} aria-hidden className="pointer-events-none absolute inset-0" style={{ background: came.out === "taken" ? "radial-gradient(circle at 50% 50%, rgba(255,220,130,.75), rgba(255,220,130,0) 60%)" : "radial-gradient(circle at 50% 50%, rgba(20,20,26,.6), rgba(20,20,26,0) 60%)", animation: reduced ? undefined : "sm-flash 700ms ease-out both", opacity: reduced ? 0 : undefined }} />}
                </>
              )}
              {/* what the last thing done came to: a strip at the picture's foot, so that nothing under it moves */}
              <p className={`absolute inset-x-0 bottom-0 px-3 pb-1.5 pt-6 text-center text-ui font-semibold leading-relaxed ${said ? "bg-gradient-to-t from-black/85 via-black/60 to-transparent" : ""} ${said?.tone === "good" ? "text-[#ffe9a8]" : said?.tone === "bad" ? "text-[#ffb4a0]" : "text-[#f3e3c3]"}`}
                 aria-live="polite" data-smith-said data-out={came?.out ?? ""}>{said?.text ?? ""}</p>
            </div>
          )}

          <div className="px-3 pb-4 pt-3">

            {view === "smelt" && (
              <div data-smith-smelt>
                {/* what is done and waits */}
                {q.done.length > 0 && (
                  <div className="mb-3 flex items-center gap-2 rounded-2xl border-2 border-[#f0c46a] bg-[#3a2a12] px-3 py-2" data-smith-done={q.done.length}>
                    <ul className="flex min-w-0 flex-1 flex-wrap gap-1" aria-label={t("หลอมเสร็จแล้ว", "Done")}>
                      {q.done.map((d, i) => <li key={i}><ItemIcon id={d.piece} size={26} /></li>)}
                    </ul>
                    <button type="button" onClick={() => void takeDone()} disabled={busy} data-smith-take className="pressable min-h-10 shrink-0 rounded-full bg-[#f0c46a] px-4 text-ui font-bold text-[#2a190d]">{t("รับของ", "Take")}</button>
                  </div>
                )}
                {/* the queue: a place for each piece on the fire or waiting its turn */}
                <div className="rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] p-2.5 shadow-[inset_0_6px_14px_rgba(0,0,0,0.6)]">
                  <p className="mb-2 flex items-center justify-between font-data text-label uppercase text-[#c9a877]">
                    <span>{t("ที่หลอม", "The queue")}</span><span className="tabular-nums" data-smith-places={q.places} data-smith-free={q.free}>{q.places - q.free} / {q.places}</span>
                  </p>
                  <ul className="grid grid-cols-3 gap-1.5" data-smith-queue>
                    {Array.from({ length: q.places }, (_, i) => {
                      const piece = (q.now ? [q.now, ...q.waiting] : q.waiting)[i];
                      const on = !!piece && piece === q.now;
                      if (!piece) return <li key={i} className="grid h-16 place-items-center rounded-xl border-2 border-dashed border-[#4a341f] bg-[#241a10]"><span className="sr-only">{t("ที่ว่าง", "A free place")}</span></li>;
                      const share = on ? Math.max(0, Math.min(1, (now - piece.from) / Math.max(1, piece.till - piece.from))) : 0;
                      return (
                        <li key={i} className={`relative flex h-16 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border-2 ${on ? "border-[#e8893a] bg-[#3a2212]" : "border-[#6b4a2a] bg-[#33251a]"}`} data-smith-piece={piece.piece} data-on={on}>
                          <ItemIcon id={piece.piece} size={26} className={on ? "" : "opacity-60"} />
                          <span className={`font-data text-label tabular-nums ${on ? "font-semibold text-[#ffd9a0]" : "text-[#c9a877]"}`}>{on ? clock(piece.till - now) : t("รอคิว", "Waiting")}</span>
                          {on && <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[#2a190d]"><span className="block h-full bg-[#e8893a]" style={{ width: `${share * 100}%` }} /></span>}
                        </li>
                      );
                    })}
                  </ul>
                  {(() => {
                    const more = widerCost(told.smithy);
                    if (!more) return null;
                    const noTimber = held(purse.bag, "timber") < more.timber, noCoins = purse.coins < more.coins;
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#4a341f] pt-2" data-smith-wider>
                        <span className="text-meta text-[#c9a877]">{t(`เพิ่มที่หลอมอีก ${SMITH.wider} ที่`, `${SMITH.wider} more places`)}</span>
                        <Need id="timber" have={held(purse.bag, "timber")} want={more.timber} th={th} />
                        <NeedCoins have={purse.coins} want={more.coins} th={th} />
                        <button type="button" onClick={() => void widenNow()} disabled={busy || noTimber || noCoins} data-smith-widen
                                className="pressable ml-auto min-h-9 rounded-full border border-[#c9a877] px-3 text-meta font-semibold text-[#f3e3c3] disabled:border-[#4a341f] disabled:text-[#8f7655]">{t("ขยาย", "Widen")}</button>
                      </div>
                    );
                  })()}
                </div>
                {/* the fuel, as it stands */}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-[#e9d3a6]" data-smith-fuel data-timber={held(purse.bag, "timber")} data-ember={told.smithy.ember}>
                  <span className="flex items-center gap-1"><ItemIcon id="timber" size={16} />{itemName("timber", th)} ×{held(purse.bag, "timber")}</span>
                  {told.smithy.ember > 0 && <span className="flex items-center gap-1 text-[#ffd9a0]"><TownIcon name="smithBellows" size={16} />{t(`ไฟยังแรง หลอมได้อีก ${told.smithy.ember} ชิ้นโดยไม่ใช้ไม้`, `The fire is still hot: ${told.smithy.ember} more piece${told.smithy.ember > 1 ? "s" : ""} with no timber`)}</span>}
                </p>
                {/* what the bag can smelt */}
                <h3 className="mb-1.5 mt-4 font-display text-lead font-semibold text-[#f3e3c3]">{t("หลอมอะไรดี", "What to smelt")}</h3>
                {(() => {
                  const mine = (Object.keys(SMELTS) as ItemId[]).filter((piece) => held(purse.bag, SMELTS[piece]!.of) > 0);
                  if (!mine.length) return <p className="rounded-xl border border-dashed border-[#6b4a2a] px-3 py-4 text-center text-ui text-[#c9a877]" data-smith-nothing>{t("ในกระเป๋าไม่มีเศษแร่หรือเศษพลอย", "There are no fragments in the bag")}</p>;
                  return <ul className="space-y-1.5">{mine.map((piece) => <SmeltRow key={piece} piece={piece} th={th} busy={busy} free={q.free} may={maySmelt(purse, told.smithy, piece, now)} have={held(purse.bag, SMELTS[piece]!.of)} coins={purse.coins} timber={held(purse.bag, "timber")}
                                                                       costOf={(n) => smeltCost(purse, told.smithy, piece, n)!} burns={(n) => timberFor(told.smithy, n, dryOf(purse.bag)).timber} onSmelt={(n) => void smeltNow(piece, n)} />)}</ul>;
                })()}
                {/* friends whose fire burns: the bellows */}
                {fires.length > 0 && (
                  <>
                    <h3 className="mb-1.5 mt-4 font-display text-lead font-semibold text-[#f3e3c3]">{t("เตาของเพื่อนที่ยืนอยู่ใกล้ๆ", "Friends' fires close by")}</h3>
                    <ul className="space-y-1.5" data-smith-fires>
                      {fires.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 rounded-xl border border-[#6b4a2a] bg-[#2a1d12] px-2.5 py-2" data-smith-fire={f.id}>
                          <ItemIcon id={f.piece.piece} size={24} />
                          <span className="min-w-0 flex-1 truncate text-ui text-[#f3e3c3]">{f.name}</span>
                          <span className="font-data text-meta tabular-nums text-[#ffd9a0]">{clock(f.piece.till - now)}</span>
                          <button type="button" onClick={() => void blow(f.id)} disabled={busy || f.left < 1 || f.piece.till <= now} data-smith-blow={f.id} data-left={f.left}
                                  className="pressable flex min-h-9 items-center gap-1.5 rounded-full bg-[#e8893a] px-3 text-meta font-bold text-[#2a190d] disabled:bg-[#4a341f] disabled:text-[#8f7655]">
                            <TownIcon name="smithBellows" size={16} />{t("สูบลม", "Bellows")}
                            <span className="flex gap-0.5" aria-label={t(`เหลือ ${f.left} ครั้ง`, `${f.left} left`)}>{Array.from({ length: SMITH.bellows.each }, (_, i) => <span key={i} aria-hidden className={`size-1.5 rounded-full ${i < f.left ? "bg-[#2a190d]" : "bg-[#2a190d]/25"}`} />)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {view === "forge" && (
              <div data-smith-forge>
                {rack}
                {offer}
                {/* drawing an option again: which gem pays */}
                {again !== null && stack && !laid && (
                  <div className="mb-3 rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] p-3" data-smith-redraw={again}>
                    <p className="text-ui text-[#f3e3c3]">{t("สุ่มออปชันนี้ใหม่ ใช้พลอย 1 เม็ด (ธาตุไหนก็ได้) กับ", "Draw this option again for 1 gem of any element and")} <Coins n={SMITH.redraw.fee} th={th} small className="inline-flex" /></p>
                    {gems.length ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {gems.map((g) => (
                          <li key={g.gem}><button type="button" onClick={() => void redraw(g.gem)} disabled={busy || purse.coins < SMITH.redraw.fee} data-smith-pay={g.gem} aria-label={`${itemName(g.gem, th)} ×${g.n}`}
                                                  className="pressable flex min-h-10 items-center gap-1.5 rounded-full border border-[#6b4a2a] bg-[#33251a] px-3 text-meta text-[#f3e3c3] hover:border-[#c9a877] disabled:opacity-50">
                            <ItemIcon id={g.gem} size={20} />{itemName(g.gem, th)} <span className="font-data tabular-nums text-[#c9a877]">×{g.n}</span></button></li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-meta text-[#ffb4a0]">{t("ในกระเป๋าไม่มีพลอย", "There is no gem in the bag")}</p>}
                    {purse.coins < SMITH.redraw.fee && <p className="mt-2 text-meta text-[#ffb4a0]">{th ? WHY.coins[0] : WHY.coins[1]}</p>}
                  </div>
                )}
                {/* the next try: what it takes, how it may go */}
                {stack && kind && !laid && again === null && (level >= FORGE.top ? (
                  <p className="rounded-2xl border-2 border-[#f0c46a] bg-[#3a2a12] px-3 py-3 text-center font-display text-lead font-semibold text-[#ffe9a8]" data-smith-top>{t("ถึงขั้นสูงสุดแล้ว", "It is at the top")}</p>
                ) : cost && odds && (
                  <div className="rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] p-3 shadow-[inset_0_6px_14px_rgba(0,0,0,0.6)]" data-smith-try data-to={level + 1}>
                    <p className="flex items-center gap-2 font-display text-lead font-semibold text-[#f3e3c3]">
                      <span>{itemName(stack.item, th)}</span><span className="tabular-nums">+{level}</span><TownIcon name="chevron" size={12} className="-rotate-90" /><span className="tabular-nums text-[#f0c46a]">+{level + 1}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Need id={cost.ore} have={held(purse.bag, cost.ore)} want={cost.n} th={th} />
                      <Need id="timber" have={held(purse.bag, "timber")} want={cost.timber} th={th} />
                      <NeedCoins have={purse.coins} want={cost.fee} th={th} />
                    </div>
                    <Odds odds={odds} th={th} />
                    <button type="button" onClick={() => void strike()} disabled={busy || lacks.length > 0} data-smith-strike
                            className="pressable mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f0c46a] font-display text-title font-bold text-[#2a190d] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] disabled:bg-[#4a341f] disabled:text-[#8f7655] disabled:shadow-none">
                      <TownIcon name="hammer" size={20} />{busy ? t("กำลังตี…", "Striking…") : t("ตี", "Strike")}
                    </button>
                  </div>
                ))}
                {card && <div className="mt-3">{card}</div>}
              </div>
            )}

            {view === "gems" && (
              <div data-smith-gems>
                {rack}
                {stack && kind && (
                  <div className="mb-3 rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] p-3 shadow-[inset_0_6px_14px_rgba(0,0,0,0.6)]">
                    <p className="mb-2 font-data text-label uppercase text-[#c9a877]">{t("พลอยในกระเป๋า", "Gems in the bag")}</p>
                    {gems.length ? (
                      <ul className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("พลอยในกระเป๋า", "Gems in the bag")}>
                        {gems.map((g) => {
                          const cannot = !settable(kind, g.element) || g.element === setElement;
                          return (
                            <li key={g.gem}><button type="button" role="radio" aria-checked={chosenGem === g.gem} onClick={() => setGem(chosenGem === g.gem ? null : g.gem)} disabled={busy || cannot} data-smith-pick-gem={g.gem} data-can={!cannot}
                                                    className={`pressable flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3 text-meta disabled:opacity-40 ${chosenGem === g.gem ? "border-[#f0c46a] bg-[#4a3423] text-[#f3e3c3]" : "border-[#6b4a2a] bg-[#33251a] text-[#f3e3c3] hover:border-[#c9a877]"}`}>
                              <ItemIcon id={g.gem} size={20} />{itemName(g.gem, th)} <span className="font-data tabular-nums text-[#c9a877]">×{g.n}</span></button></li>
                          );
                        })}
                      </ul>
                    ) : <p className="text-meta text-[#8f7655]" data-smith-no-gems>{t("ในกระเป๋าไม่มีพลอย", "There is no gem in the bag")}</p>}
                    {chosenGem && (
                      <div className="mt-3 border-t border-[#4a341f] pt-3" data-smith-setting={chosenGem}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Need id={chosenGem} have={held(purse.bag, chosenGem)} want={1} th={th} />
                          <Need id={SMITH.gem.mount} have={held(purse.bag, SMITH.gem.mount)} want={SMITH.gem.mounts} th={th} />
                          <NeedCoins have={purse.coins} want={SMITH.gem.fee} th={th} />
                        </div>
                        {setElement && (
                          <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-[#b3402f] bg-[#3a1712] px-2.5 py-2 text-meta leading-relaxed text-[#ffb4a0]" data-smith-warn>
                            <TownIcon name="warning" size={14} className="mt-0.5" />{t(`${itemName(GEMS[setElement].gem, true)}ที่ฝังอยู่จะหายไป เอาคืนไม่ได้`, `The ${itemName(GEMS[setElement].gem, false).toLowerCase()} set in it now will be gone for good`)}
                          </p>
                        )}
                        <button type="button" onClick={() => void setIt()} disabled={busy || held(purse.bag, SMITH.gem.mount) < SMITH.gem.mounts || purse.coins < SMITH.gem.fee} data-smith-set
                                className="pressable mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f0c46a] font-display text-title font-bold text-[#2a190d] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] disabled:bg-[#4a341f] disabled:text-[#8f7655] disabled:shadow-none">
                          <TownIcon name="smithSocket" size={20} />{setElement ? t("ฝังทับ", "Set it over") : t("ฝังพลอย", "Set the gem")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {card}
              </div>
            )}

            {view === "board" && (
              <div data-smith-board>
                {cave && (() => {
                  const deep = cave.call(keeper);
                  return (
                    <div className="mb-3 rounded-2xl border-2 border-[#2e1c0c] bg-[#f0e0b8] px-3 py-2.5 text-[#3a2612] shadow-[2px_3px_0_rgba(0,0,0,0.3)]" data-smith-cave={deep?.floor ?? 0}>
                      <p className="font-data text-label uppercase text-[#7a5a30]">{t("ลึกสุดของวันนี้", "Today's deepest")}</p>
                      {deep ? <p className="font-display text-lead font-semibold">{t(`ชั้น ${deep.floor}`, `Floor ${deep.floor}`)} <span className="text-ui font-normal">· {deep.by}</span></p>
                        : <p className="text-ui text-[#7a5a30]">{t("วันนี้ยังไม่มีใครลงไป", "Nobody has gone down today")}</p>}
                    </div>
                  );
                })()}
                <div className="rounded-2xl border-2 border-[#2e1c0c] bg-[#f0e0b8] px-3 py-2.5 text-[#3a2612] shadow-[2px_3px_0_rgba(0,0,0,0.3)]">
                  <p className="mb-1.5 font-data text-label uppercase text-[#7a5a30]">{t("คนแรกที่ตีถึง +10", "First to forge to +10")}</p>
                  <ul>
                    {TOOL_KINDS.map((k) => {
                      const first = told.board.tops[k];
                      return (
                        <li key={k} className="flex items-center gap-2 border-t border-[#d9c39b] py-1.5 first:border-t-0" data-smith-top-of={k} data-by={first?.by ?? ""}>
                          <ItemIcon id={k} size={22} /><span className="min-w-0 flex-1 truncate text-ui">{th ? KIND_WORD[k][0] : KIND_WORD[k][1]}</span>
                          <span className={`min-w-0 max-w-[55%] truncate text-ui ${first ? "font-semibold" : "text-[#a88d5e]"}`}>{first ? first.name || "?" : t("ยังไม่มีใคร", "Nobody yet")}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {/* the village's book of options: what has been found, and by whom first; what nobody has found is a shade */}
                <div className="mt-3 rounded-2xl border-2 border-[#2e1c0c] bg-[#1d140c] p-3 shadow-[inset_0_6px_14px_rgba(0,0,0,0.6)]" data-smith-book>
                  {(() => {
                    const known = OPTION_IDS.filter((id) => BUILT[OPTIONS[id].tools[0]].opts.includes(id)), found = known.filter((id) => told.board.found[id]);
                    const families: Array<[ToolKind, OptionId[]]> = (["pick", "axe", "rod", "hoe", "can", "bugNet", "pot"] as ToolKind[]).map((k) => [k, known.filter((id) => (OPTIONS[id].tools as readonly ToolKind[]).includes(k))]);
                    return (
                      <>
                        <p className="mb-2 flex items-center justify-between font-data text-label uppercase text-[#c9a877]"><span>{t("สมุดออปชันของหมู่บ้าน", "The village's book of options")}</span><span className="tabular-nums" data-smith-found={found.length}>{found.length} / {known.length}</span></p>
                        {families.filter(([, ids]) => ids.length).map(([k, ids]) => (
                          <div key={k} className="mt-2 first:mt-0">
                            <p className="mb-1 flex items-center gap-1.5 text-meta text-[#c9a877]"><ItemIcon id={k} size={16} />{k === "pot" ? t("เครื่องครัว", "Cookware") : th ? KIND_WORD[k][0] : KIND_WORD[k][1]}</p>
                            <ul className="flex flex-wrap gap-1.5">
                              {ids.map((id) => {
                                const first = told.board.found[id];
                                return first ? (
                                  <li key={id} className="rounded-lg border border-[#6b4a2a] bg-[#33251a] px-2 py-1" data-smith-known={id}>
                                    <span className="block text-meta font-semibold text-[#f3e3c3]">{th ? OPTIONS[id].name.th : OPTIONS[id].name.en}</span>
                                    <span className="block max-w-[9rem] truncate text-label text-[#c9a877]">{first.name || "?"}</span>
                                  </li>
                                ) : <li key={id} className="grid h-[2.6rem] w-16 place-items-center rounded-lg border border-dashed border-[#4a341f] bg-[#241a10]" data-smith-shade><TownIcon name="mystery" size={16} className="opacity-40" /><span className="sr-only">{t("ยังไม่มีใครพบ", "Nobody has found this one")}</span></li>;
                              })}
                            </ul>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** A thing a deed takes: how many are wanted, how many there are, marked where there are too few. */
function Need({ id, have, want, th }: { id: ItemId; have: number; want: number; th: boolean }) {
  const short = have < want;
  return (
    <span className={`flex items-center gap-1 rounded-full border px-2 py-1 font-data text-meta tabular-nums ${short ? "border-[#b3402f] bg-[#3a1712] text-[#ffb4a0]" : "border-[#6b4a2a] bg-[#33251a] text-[#f3e3c3]"}`}
          data-smith-need={id} data-have={have} data-want={want} data-short={short} title={th ? ITEMS[id].name.th : ITEMS[id].name.en}>
      <ItemIcon id={id} size={18} /><span className="sr-only">{th ? ITEMS[id].name.th : ITEMS[id].name.en} </span>{have}<span className="opacity-60">/</span>{want}
    </span>
  );
}
function NeedCoins({ have, want, th }: { have: number; want: number; th: boolean }) {
  const short = have < want;
  return (
    <span className={`flex items-center gap-1 rounded-full border px-2 py-1 font-data text-meta tabular-nums ${short ? "border-[#b3402f] bg-[#3a1712] text-[#ffb4a0]" : "border-[#6b4a2a] bg-[#33251a] text-gold"}`} data-smith-need="coins" data-want={want} data-short={short}>
      <TownIcon name="coin" size={14} />{want}<span className="sr-only"> {th ? "Popoto coin" : "Popoto coins"}</span>
    </span>
  );
}
/** How a try may go, shown before it: three shares of one bar, each with its number. */
function Odds({ odds, th }: { odds: { take: number; stay: number; down: number }; th: boolean }) {
  const parts: Array<[keyof typeof odds, string, string, string, string]> = [
    ["take", "ติด", "Takes", "bg-[#5fbf7a]", "text-[#a8e6b8]"], ["stay", "ไม่ติด คงเดิม", "Fails, stays", "bg-[#8f97a3]", "text-[#d5dae2]"], ["down", "ไม่ติด ลด 1", "Fails, 1 down", "bg-[#d2553f]", "text-[#ffb4a0]"],
  ];
  return (
    <div className="mt-3" data-smith-odds={`${odds.take}/${odds.stay}/${odds.down}`}>
      <div className="flex h-3 overflow-hidden rounded-full border border-[#2a190d] bg-[#2a190d]" aria-hidden>
        {parts.map(([key, , , bar]) => (odds[key] > 0 ? <span key={key} className={bar} style={{ width: `${odds[key]}%` }} /> : null))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {parts.map(([key, thai, en, bar, ink]) => (
          <li key={key} className={`flex items-center gap-1 text-meta ${odds[key] > 0 ? ink : "text-[#6b5a45]"}`}>
            <span aria-hidden className={`size-2 rounded-full ${odds[key] > 0 ? bar : "bg-[#4a341f]"}`} />{th ? thai : en} <span className="font-data font-semibold tabular-nums">{odds[key]}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
/** One option of a draw, on a card of its own: its name, what it does, and the button that takes it. */
function OptionCard({ id, th, at, keep, busy, reduced, delay, onPick }: { id: OptionId; th: boolean; at: number; keep: boolean; busy: boolean; reduced: boolean; delay: number; onPick: () => void }) {
  const o = OPTIONS[id], does = optionDoes(id);
  return (
    <li className={`flex flex-col rounded-2xl border-2 p-2.5 ${keep ? "border-[#6b4a2a] bg-[#2a1d12]" : "border-[#f0c46a] bg-gradient-to-b from-[#4a3423] to-[#2a1d12] shadow-[0_0_0_2px_rgba(240,196,106,0.18)]"}`}
        style={reduced ? undefined : { animation: `sm-rise 220ms ease-out ${delay}ms both` }} data-smith-option={id} data-keep={keep}>
      <span className="font-data text-label uppercase text-[#c9a877]">{keep ? (th ? "อันเดิม" : "The old one") : th ? `ออปชันขั้น +${at}` : `An option of +${at}`}</span>
      <span className="mt-0.5 font-display text-lead font-semibold leading-snug text-[#f3e3c3]">{th ? o.name.th : o.name.en}</span>
      <span className="mt-1 flex-1 text-meta leading-relaxed text-[#d9c39b]">{th ? does.th : does.en}</span>
      <button type="button" onClick={onPick} disabled={busy} data-smith-choose={id}
              className={`pressable mt-2 min-h-10 rounded-xl text-ui font-bold ${keep ? "border border-[#c9a877] text-[#f3e3c3]" : "bg-[#f0c46a] text-[#2a190d]"} disabled:opacity-50`}>{keep ? (th ? "เก็บอันเดิม" : "Keep it") : th ? "เลือก" : "Choose"}</button>
    </li>
  );
}
/** One thing the bag can smelt: what it is made of and what it takes, how many, and the button; marked where something is lacking. */
function SmeltRow({ piece, th, busy, free, may, have, coins, timber, costOf, burns, onSmelt }: {
  piece: ItemId; th: boolean; busy: boolean; free: number; may: number; have: number; coins: number; timber: number;
  costOf: (n: number) => { of: ItemId; fragments: number; timber: number; fee: number }; burns: (n: number) => number; onSmelt: (n: number) => void;
}): ReactNode {
  const rule = SMELTS[piece]!, [n, setN] = useState(1), many = Math.max(1, Math.min(n, Math.max(1, may))), cost = costOf(many);
  const why = may > 0 ? null : free < 1 ? "places" : have < cost.fragments ? "ore" : timber < burns(1) ? "timber" : coins < rule.fee ? "coins" : "places";
  return (
    <li className="rounded-xl border border-[#6b4a2a] bg-[#2a1d12] px-2.5 py-2" data-smith-row={piece} data-may={may}>
      <div className="flex items-center gap-2">
        <ItemIcon id={rule.of} size={22} /><TownIcon name="chevron" size={10} className="-rotate-90 opacity-70" /><ItemIcon id={piece} size={26} />
        <span className="min-w-0 flex-1 truncate text-ui font-semibold text-[#f3e3c3]">{th ? ITEMS[piece].name.th : ITEMS[piece].name.en}</span>
        <span className="font-data text-meta tabular-nums text-[#c9a877]">{rule.mins} {th ? "นาที" : "min"}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Need id={rule.of} have={have} want={cost.fragments} th={th} />
        <Need id="timber" have={timber} want={cost.timber} th={th} />
        <NeedCoins have={coins} want={cost.fee} th={th} />
        <span className="ml-auto flex items-center gap-1">
          {may > 1 && (
            <span className="flex items-center rounded-full border border-[#6b4a2a] bg-[#1d140c]">
              <button type="button" onClick={() => setN(Math.max(1, many - 1))} disabled={busy || many <= 1} aria-label={th ? "ลดจำนวน" : "Fewer"} className="pressable grid size-9 place-items-center text-ui text-[#f3e3c3] disabled:opacity-40">−</button>
              <span className="w-5 text-center font-data text-ui tabular-nums text-[#f3e3c3]" data-smith-n>{many}</span>
              <button type="button" onClick={() => setN(Math.min(may, many + 1))} disabled={busy || many >= may} aria-label={th ? "เพิ่มจำนวน" : "More"} className="pressable grid size-9 place-items-center text-ui text-[#f3e3c3] disabled:opacity-40">+</button>
            </span>
          )}
          <button type="button" onClick={() => onSmelt(many)} disabled={busy || may < 1} data-smith-do={piece}
                  className="pressable min-h-9 rounded-full bg-[#e8893a] px-4 text-meta font-bold text-[#2a190d] disabled:bg-[#4a341f] disabled:text-[#8f7655]">{th ? "หลอม" : "Smelt"}</button>
        </span>
      </div>
      {why && <p className="mt-1.5 text-meta text-[#ffb4a0]" data-smith-why={why}>{th ? WHY[why][0] : WHY[why][1]}</p>}
    </li>
  );
}
