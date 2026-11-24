"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawPart, krathongImage } from "@/lib/town/krathong-art";
import popotoArt from "@/assets/popoto/popoto.webp";
import type { Keeper } from "@/lib/town/keeper";
import { ITEMS, iconOf, type ItemId } from "@/lib/town/items";
import { GOODS, held } from "@/lib/town/trade";
import { PHASES, PHASE_ICON, PHASE_NAME, isOpen, phaseState, shortWhen, untilText, whenText, windowOf, type Festival } from "@/lib/town/festivals";
import {
  COLORS, MAX_TRIMS, PART, START, bestPay, check, colorOf, costOf, costOfPicks, familiesOf, partsOf, picksOf, shuffledFor,
  type AwardView, type Design, type DrawList, type GalleryEntry, type KrathongState, type Pick, type Slot,
} from "@/lib/town/krathong";
import KrathongCanvas from "./KrathongCanvas";
import TownIcon, { type IconName } from "./TownIcon";

type Tab = "make" | "gallery" | "float" | "results" | "draw";
const icon = (name: string) => name as IconName;
/** Whether the town's shop sells a thing (the builder marks it, and pays with it when the bag has nothing better). */
const inShop = (id: ItemId) => !!GOODS[id];

/**
 * Loy Krathong's stall beside the Popoto Board (v336): put a krathong together from the things of every line and
 * enter it; look at the entries and give popoto; float mine with a wish; see the year's outstanding makers.
 * Pictures and icon chips, few words (the owner's taste, 2026-11-07); the long how-to is in the gift guide.
 */
export default function TownKrathong({ keeper, th, festival, admin, me, phone, onClose, onFloated }: {
  keeper: Keeper; th: boolean; festival: number; admin: boolean; me: string; phone: boolean;
  onClose: () => void;
  /** My krathong was floated: the map may show it set off. */
  onFloated?: () => void;
}) {
  const [st, setSt] = useState<KrathongState | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  const [, setPurseTick] = useState(0);
  const load = useCallback(async () => {
    const s = await keeper.krathong(festival);
    if (s) { setSt(s); setFailed(false); } else setFailed(true);
  }, [keeper, festival]);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    const unwatch = keeper.watch(() => setPurseTick((n) => n + 1));
    return () => { clearInterval(t); unwatch(); };
  }, [load, keeper]);

  const now = st?.now ?? Date.now();
  const f = st?.festival;
  const open = (k: Parameters<typeof windowOf>[1]) => !!f && isOpen(windowOf(f, k), now);
  const making = open("make"), floating = open("float"), voting = open("vote"), results = !!st?.awards;
  const tabs: Tab[] = useMemo(() => {
    const out: Tab[] = [];
    if (results) out.push("results");
    if (making || (floating && !st?.mine)) out.push("make");
    if (floating && st?.mine) out.push("float");
    out.push("gallery");
    if (!results && !making && !floating) out.unshift("make");
    // (the lucky draw's list, for the admins, once krathongs are floated: v339, Aqua's event)
    if (admin && keeper.festivalDraw && (floating || results)) out.push("draw");
    return [...new Set(out)];
  }, [results, making, floating, st?.mine, admin, keeper]);
  const shown: Tab = tab && tabs.includes(tab) ? tab : tabs[0];

  return (
    <section aria-labelledby="town-krathong-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <TownIcon name={icon("floatKrathong")} size={28} />
        <div className="min-w-0">
          <h2 id="town-krathong-h" className="truncate font-display text-title font-semibold text-ink">
            {th ? `ลอยกระทง ${f?.year ?? ""}` : `Loy Krathong ${f?.year ?? ""}`}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="pressable ml-auto min-h-11 shrink-0 rounded-full bg-accent px-4 text-ui font-semibold text-bg">
          {th ? "ปิด" : "Close"}
        </button>
      </div>
      {f && <PhaseSteps f={f} now={now} th={th} />}
      {st && tabs.length > 1 && (
        <div role="tablist" className="flex gap-1.5 border-b border-line px-3 py-2">
          {tabs.map((t) => (
            <button key={t} role="tab" type="button" aria-selected={shown === t} onClick={() => setTab(t)}
                    className={`pressable flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-ui font-semibold ${shown === t ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"}`}>
              <TownIcon name={icon(TAB_ICON[t])} size={18} />
              <span className="truncate">{tabName(t, th, st)}</span>
            </button>
          ))}
        </div>
      )}
      {/* (on a phone the HUD's round button stays at the bottom-left corner: room is left for it) */}
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 ${phone ? "pb-16" : "pb-4"}`}>
        {!st && (
          <p className="py-8 text-center text-meta text-muted" aria-live="polite">
            {failed ? (th ? "ซุ้มกระทงยังไม่เปิด" : "The krathong stall isn't open yet") : (th ? "กำลังเปิดซุ้ม…" : "Opening…")}
          </p>
        )}
        {st && shown === "make" && <Builder keeper={keeper} th={th} st={st} phone={phone} making={making} floating={floating}
                                            onDone={async () => { await load(); if (floating) setTab("float"); }} onFloat={() => setTab("float")} />}
        {st && shown === "gallery" && <Gallery keeper={keeper} th={th} st={st} me={me} admin={admin} voting={voting} phone={phone} onChanged={load} setSt={setSt} />}
        {st && shown === "float" && st.mine && <Float keeper={keeper} th={th} st={st} phone={phone} onDone={() => { void load(); onFloated?.(); }} />}
        {st && shown === "results" && st.awards && <Results th={th} awards={st.awards} phone={phone} mine={st.mine?.id ?? null} />}
        {st && shown === "draw" && <Draw keeper={keeper} th={th} festival={st.festival.id} />}
      </div>
    </section>
  );
}

const TAB_ICON: Record<Tab, string> = { make: "krathongKeepsake", gallery: "festivalLantern", float: "floatKrathong", results: "krathongTrophy", draw: "coin" };
function tabName(t: Tab, th: boolean, st: KrathongState): string {
  if (t === "make") return st.mine ? (th ? "กระทงของฉัน" : "Mine") : (th ? "ทำกระทง" : "Make");
  if (t === "gallery") return th ? `ประกวด · ${st.entries.length}` : `Entries · ${st.entries.length}`;
  if (t === "float") return th ? "ลอย" : "Float";
  if (t === "draw") return th ? "ลุ้นรางวัล" : "Draw";
  return th ? "ผลประกาศ" : "Results";
}

/**
 * The festival's phases in a row (the owner, 2026-11-24: "ประกาศเฟสทำกระทง โหวต ลอย ให้ชัดเจน"): making, voting,
 * floating, the results; the one open now lit with how long it has left, those to come with when, those over ticked.
 */
function PhaseSteps({ f, now, th }: { f: Festival; now: number; th: boolean }) {
  return (
    <ol className="grid grid-cols-4 gap-1 border-b border-line px-3 py-2" aria-label={th ? "ช่วงของเทศกาล" : "The festival's phases"}>
      {PHASES.map((k) => {
        const w = windowOf(f, k), at = phaseState(f, k, now);
        if (!w) return null;
        const when = at === "now" ? (w.until ? `${th ? "เหลือ " : ""}${untilText(w.until, now, th)}` : (th ? "ตอนนี้" : "Now"))
          : at === "next" ? shortWhen(w.from, now, th) : (th ? "จบแล้ว" : "Over");
        return (
          <li key={k} aria-current={at === "now" ? "step" : undefined} data-phase={k} data-phase-at={at}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-center ${at === "now" ? "bg-accent/15 text-accent" : at === "done" ? "text-muted" : "text-ink/85"}`}>
            <span className="relative">
              <TownIcon name={icon(PHASE_ICON[k])} size={22} />
              {at === "done" && <span aria-hidden className="absolute -bottom-0.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-[#4ade80] text-[9px] font-bold leading-none text-bg">✓</span>}
            </span>
            <span className="w-full truncate text-[12px] font-semibold leading-tight">{th ? PHASE_NAME[k].th : PHASE_NAME[k].en}</span>
            <span className="font-data text-[11.5px] font-medium leading-tight tabular-nums">{when}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ── the builder ──
//
// (the owner, 2026-11-24: "ทำให้ทุก step เล่นง่ายๆ เข้าใจง่ายๆ", and "เอาให้เปลี่ยนสีได้ด้วย ในแต่ละส่วนประกอบ": one part a
// step, its pictures, its colours and what it is paid with, Back and Next under them; the name and the send last)

const SLOT_INDEX = { base: 0, ring: 1, light: 2, centre: 3 } as const;
type Step = Slot | "send";
const STEPS: Array<{ step: Step; th: string; en: string; askTh: string; askEn: string }> = [
  { step: "base", th: "ฐาน", en: "Base", askTh: "เลือกฐานกระทง", askEn: "Choose a base" },
  { step: "ring", th: "กลีบ", en: "Petals", askTh: "เลือกกลีบรอบกระทง", askEn: "Choose the petals" },
  { step: "centre", th: "ตรงกลาง", en: "Centre", askTh: "เลือกของตรงกลาง", askEn: "Choose the centrepiece" },
  { step: "light", th: "แสง", en: "Light", askTh: "เลือกเทียนหรือแสงไฟ", askEn: "Choose a light" },
  { step: "trim", th: "ขอบ", en: "Trims", askTh: "แต่งขอบได้ 3 ชิ้น ไม่ใส่ก็ได้", askEn: "Up to three trims, or none" },
  { step: "send", th: "ส่ง", en: "Send", askTh: "ตั้งชื่อกระทง แล้วส่ง", askEn: "Name it and send it" },
];
const withPay = (p: Pick, i: number): Pick => (colorOf(p) ? [p[0], i, colorOf(p)] : [p[0], i]);
const withColor = (p: Pick, c: number): Pick => (c ? [p[0], p[1], c] : [p[0], p[1]]);

function Builder({ keeper, th, st, phone, making, floating, onDone, onFloat }: {
  keeper: Keeper; th: boolean; st: KrathongState; phone: boolean; making: boolean; floating: boolean; onDone: () => Promise<void>;
  /** The way on to floating it, once it is made and the float is open. */
  onFloat?: () => void;
}) {
  const bag = keeper.purse().bag;
  const have = useCallback((id: ItemId) => held(bag, id), [bag]);
  const [d, setD] = useState<Design>(() => {
    const pay = (id: string, taken = new Map<ItemId, number>()) => [id, bestPay(id, (x) => held(keeper.purse().bag, x), taken, inShop)] as Pick;
    return { base: pay(START.base[0]), ring: pay(START.ring[0]), light: pay(START.light[0]), centre: pay(START.centre[0]), trims: [] };
  });
  const [step, setStep] = useState(0);
  const [trimAt, setTrimAt] = useState(0);
  const [name, setName] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const cost = useMemo(() => [...costOf(d)], [d]);
  const short = cost.some(([id, n]) => have(id) < n);
  const zoom = phone ? 3 : 4;

  if (st.mine) {
    return (
      <div className="flex flex-col items-center gap-3">
        <KrathongCanvas design={st.mine.design} zoom={zoom} water className="w-full py-3" />
        <p className="text-read font-semibold text-ink">{st.mine.name}</p>
        <Lines design={st.mine.design} th={th} />
        <p className="flex items-center gap-1.5 text-meta text-muted">
          <TownIcon name={icon(st.mine.entered ? "krathongTrophy" : "floatKrathong")} size={16} />
          {st.mine.entered ? (th ? "ส่งประกวดแล้ว" : "Entered") : (th ? "ทำไว้ลอย" : "Made to float")}
          {st.mine.floated ? (th ? " · ลอยแล้ว" : " · floated") : ""}
        </p>
        <p className="text-meta text-muted">{th ? "ส่งประกวดได้คนละ 1 กระทง" : "One entry each"}</p>
        {floating && !st.mine.floated && onFloat && (
          <button type="button" onClick={onFloat} className="pressable min-h-11 w-full rounded-xl bg-accent px-4 text-ui font-semibold text-bg">
            {th ? "ลอยกระทงเลย" : "Float it now"}
          </button>
        )}
      </div>
    );
  }

  const open = making || floating;
  // (any change to the design takes the confirmation back: what is confirmed is what is sent; Codex's finding)
  const change = (next: (was: Design) => Design) => { setSure(false); setD(next); };
  const choose = (slot: Slot, id: string) => {
    if (slot === "trim") {
      if (d.trims.length >= MAX_TRIMS) return;
      setTrimAt(d.trims.length);
      // (paid with what the rest of the design leaves: a third flower trim takes wildflowers when the marigolds are spent)
      change((was) => ({ ...was, trims: [...was.trims, [id, bestPay(id, have, costOfPicks(picksOf(was)), inShop)]] }));
      return;
    }
    const s = slot as keyof typeof SLOT_INDEX;
    change((was) => {
      const others = picksOf(was).filter((_, i) => i !== SLOT_INDEX[s]);
      return { ...was, [s]: withColor([id, bestPay(id, have, costOfPicks(others), inShop)], colorOf(was[s])) };
    });
  };
  const editTrim = (f: (p: Pick) => Pick) => change((was) => ({ ...was, trims: was.trims.map((t, k) => (k === trimAt ? f(t) : t)) }));
  const setPay = (slot: Slot, i: number) => slot === "trim" ? editTrim((p) => withPay(p, i)) : change((was) => ({ ...was, [slot]: withPay(was[slot as keyof typeof SLOT_INDEX], i) }));
  const setColor = (slot: Slot, c: number) => slot === "trim" ? editTrim((p) => withColor(p, c)) : change((was) => ({ ...was, [slot]: withColor(was[slot as keyof typeof SLOT_INDEX], c) }));
  const removeTrim = () => { change((was) => ({ ...was, trims: was.trims.filter((_, k) => k !== trimAt) })); setTrimAt((n) => Math.max(0, n - 1)); };
  const send = async () => {
    if (!sure) { setSure(true); return; }
    setBusy(true); setNote(null);
    const did = await keeper.krathongMake(st.festival.id, d, name, crypto.randomUUID());
    setBusy(false); setSure(false);
    if (did.ok) { keeper.purseAgain?.(); await onDone(); return; }
    setNote(refusal(did.why, th, did.item as ItemId | undefined));
  };
  const cur = STEPS[step], last = step === STEPS.length - 1;
  const makeWin = windowOf(st.festival, "make");
  // (smaller while choosing, so each step's choices come up without scrolling under the buttons)
  return (
    <div className="flex flex-col gap-2.5" data-builder-step={cur.step}>
      <KrathongCanvas design={d} zoom={phone ? 2 : 3} water className="w-full py-1.5" />
      {!open && makeWin && (
        <p className="self-center rounded-full bg-accent/15 px-3 py-1 text-meta font-semibold text-accent">
          {th ? "ลองประกอบได้เลย · เปิดส่ง" : "Try it out · opens"} {whenText(makeWin.from, th)}
        </p>
      )}
      <ol className="grid grid-cols-6 gap-1" aria-label={th ? "ขั้นตอน" : "Steps"}>
        {STEPS.map((s, i) => (
          <li key={s.step}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}
                    className={`pressable flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-0.5 text-[11px] font-semibold leading-tight ${i === step ? "bg-accent text-bg" : i < step ? "bg-accent/15 text-accent" : "bg-ink/[0.06] text-muted"}`}>
              <span className="font-data text-[12px] tabular-nums">{i + 1}</span>
              <span className="w-full truncate">{th ? s.th : s.en}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-ui font-semibold text-ink">
        {step + 1}. {th ? cur.askTh : cur.askEn}
        {cur.step !== "send" && cur.step !== "trim" && (
          <span className="font-normal text-accent"> · {th ? PART[d[cur.step as keyof typeof SLOT_INDEX][0]].name.th : PART[d[cur.step as keyof typeof SLOT_INDEX][0]].name.en}</span>
        )}
      </p>
      {cur.step === "send" ? (
        <div className="flex flex-col gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={th ? "ชื่อกระทง เช่น จันทร์ลอยน้ำ" : "A name, e.g. Moon on the Water"}
                 aria-label={th ? "ชื่อกระทง" : "Krathong name"}
                 className="min-h-11 rounded-xl border border-line-strong bg-card/60 px-3 text-ui text-ink placeholder:text-muted focus:border-accent focus:outline-none" />
          <Lines design={d} th={th} />
          {note && <p className="text-meta text-[#fca5a5]" aria-live="polite">{note}</p>}
          {sure && (
            <div className="flex items-center gap-2 rounded-xl border border-[#e5cc80]/50 bg-[#e5cc80]/[0.07] p-1.5" aria-live="polite">
              <KrathongCanvas design={d} zoom={1} water className="shrink-0 p-0.5" />
              <p className="min-w-0 text-meta text-ink"><b className="block truncate">{name.trim()}</b>{th ? "ส่งแล้วแก้ไม่ได้" : "Final once sent"}</p>
            </div>
          )}
        </div>
      ) : (
        <SlotPicker slot={cur.step} d={d} have={have} th={th} trimAt={trimAt} setTrimAt={setTrimAt}
                    onChoose={(id) => choose(cur.step as Slot, id)} onPay={(i) => setPay(cur.step as Slot, i)}
                    onColor={(c) => setColor(cur.step as Slot, c)} onRemove={removeTrim} />
      )}
      {/* (after the choices, on every screen: pinned, it lay over the colours; the steps above go anywhere too) */}
      <div className="-mx-4 flex flex-col gap-2 border-t border-line bg-surface/95 px-4 pb-4 pt-2.5">
        <div className="slim-bar flex gap-1.5 overflow-x-auto" aria-label={th ? "ของที่ต้องใช้" : "What it takes"}>
          {cost.map(([id, n]) => (
            <span key={id} title={`${th ? ITEMS[id].name.th : ITEMS[id].name.en}${GOODS[id] ? (th ? " · มีขายที่ร้านค้า" : " · sold at the shop") : ""}`}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-data text-meta tabular-nums ${have(id) < n ? "bg-[#f87171]/15 text-[#fca5a5]" : "bg-ink/[0.06] text-ink"}`}>
              <TownIcon name={icon(iconOf(id))} size={18} />{have(id)}/{n}
              {have(id) < n && GOODS[id] && <TownIcon name="coin" size={12} />}
            </span>
          ))}
        </div>
        <div className={`flex gap-2 ${phone ? "ml-12" : ""}`}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="pressable min-h-11 shrink-0 rounded-xl border border-line-strong px-4 text-ui font-semibold text-ink">
              {th ? "ย้อน" : "Back"}
            </button>
          )}
          {!last ? (
            <button type="button" onClick={() => setStep(step + 1)} className="pressable min-h-11 flex-1 rounded-xl bg-accent px-4 text-ui font-semibold text-bg">
              {th ? `ถัดไป · ${STEPS[step + 1].th}` : `Next · ${STEPS[step + 1].en}`}
            </button>
          ) : (
            <button type="button" disabled={!open || busy || short || !name.trim() || !!check(d)} onClick={() => void send()}
                    className={`pressable min-h-11 flex-1 rounded-xl px-4 text-ui font-semibold disabled:opacity-40 ${sure ? "bg-[#e5cc80] text-bg" : "bg-accent text-bg"}`}>
              {!open ? (th ? "ยังไม่เปิดส่ง" : "Not open yet")
                : short ? (() => { const [id, n] = cost.find(([i, k]) => have(i) < k)!; const lack = n - have(id); return th ? `ยังขาด ${ITEMS[id].name.th} ${lack}` : `Still need ${lack} ${ITEMS[id].name.en}`; })()
                : !name.trim() ? (th ? "ตั้งชื่อก่อน" : "Name it first")
                : sure ? (th ? "ยืนยัน · ใช้ของตามนี้" : "Confirm · uses these")
                : making ? (th ? "ส่งประกวด" : "Enter the contest") : (th ? "ทำกระทงไว้ลอย" : "Make it to float")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** One step's part: its pictures (a tap chooses one), its colours, what it is paid with; the trims' three places first. */
function SlotPicker({ slot, d, have, th, trimAt, setTrimAt, onChoose, onPay, onColor, onRemove }: {
  slot: Slot; d: Design; have: (id: ItemId) => number; th: boolean; trimAt: number; setTrimAt: (i: number) => void;
  onChoose: (id: string) => void; onPay: (i: number) => void; onColor: (c: number) => void; onRemove: () => void;
}) {
  const p: Pick | undefined = slot === "trim" ? d.trims[trimAt] : d[slot as keyof typeof SLOT_INDEX];
  const full = slot === "trim" && d.trims.length >= MAX_TRIMS;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-meta text-muted" data-shop-legend>
        <TownIcon name="coin" size={14} />{th ? "= มีขายที่ร้านค้าในเมือง" : "= sold at the town shop"}
      </p>
      {slot === "trim" && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: MAX_TRIMS }, (_, i) => {
            const tr = d.trims[i];
            return (
              <button key={i} type="button" disabled={!tr} onClick={() => setTrimAt(i)} aria-pressed={!!tr && i === trimAt}
                      aria-label={tr ? (th ? `ชิ้นที่ ${i + 1}` : `Trim ${i + 1}`) : (th ? "ว่าง" : "Empty")}
                      className={`pressable grid size-11 place-items-center rounded-lg border ${tr && i === trimAt ? "border-accent bg-accent/10" : "border-dashed border-line-strong"}`}>
                {tr ? <PartPic id={tr[0]} size={32} color={colorOf(tr)} /> : <span className="text-meta text-muted">{i + 1}</span>}
              </button>
            );
          })}
          {p && (
            <button type="button" onClick={onRemove} className="pressable ml-1 min-h-11 rounded-full border border-line-strong px-3 text-meta font-semibold text-ink">
              {th ? `เอาชิ้นที่ ${trimAt + 1} ออก` : `Remove no. ${trimAt + 1}`}
            </button>
          )}
          {full && <span className="ml-auto text-meta text-muted">{th ? "ครบ 3 ชิ้น" : "Three placed"}</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {partsOf(slot).map((part) => {
          const chosen = slot !== "trim" && p?.[0] === part.id;
          const [payId, payN] = part.pay[chosen && p ? p[1] : bestPay(part.id, have, undefined, inShop)];
          const ok = have(payId) >= payN;
          return (
            <button key={part.id} type="button" aria-pressed={chosen} disabled={full} title={th ? part.name.th : part.name.en}
                    onClick={() => onChoose(part.id)}
                    className={`pressable flex w-[4.25rem] flex-col items-center gap-0.5 rounded-xl border px-1 pb-1 pt-1.5 disabled:opacity-40 ${chosen ? "border-accent bg-accent/10" : "border-line-strong hover:border-accent"}`}>
              <PartPic id={part.id} size={40} color={chosen && p ? colorOf(p) : 0} />
              <span className={`flex items-center gap-0.5 font-data text-[11px] tabular-nums ${ok ? "text-muted" : "text-[#fca5a5]"}`}>
                <TownIcon name={icon(iconOf(payId))} size={14} />{payN}
                {inShop(payId) && <TownIcon name="coin" size={11} />}
              </span>
            </button>
          );
        })}
      </div>
      {p && (
        <>
          <span className="font-data text-label uppercase tracking-wider text-muted">{th ? "สี" : "Colour"}</span>
          <Swatches part={p[0]} chosen={colorOf(p)} th={th} onPick={onColor} />
          {PART[p[0]].pay.length > 1 && (
            <>
              <span className="font-data text-label uppercase tracking-wider text-muted">{th ? "จ่ายด้วย" : "Pay with"}</span>
              <PayChoice part={p[0]} chosen={p[1]} have={have} th={th} onPick={onPay} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/** The colours a part may take: its own first (its picture), then the dyes. */
function Swatches({ part, chosen, th, onPick }: { part: string; chosen: number; th: boolean; onPick: (c: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={th ? "สี" : "Colour"}>
      {COLORS.map((c, i) => (
        <button key={c.id} type="button" role="radio" aria-checked={i === chosen} title={th ? c.th : c.en} onClick={() => onPick(i)}
                className={`pressable grid size-11 place-items-center rounded-full border-2 ${i === chosen ? "border-accent bg-accent/10" : "border-line"}`}>
          {i === 0 ? <PartPic id={part} size={28} /> : <span aria-hidden className="size-7 rounded-full border border-black/30" style={{ background: c.swatch }} />}
        </button>
      ))}
    </div>
  );
}

/** The ways to pay for the chosen part: tap the thing to pay with. */
function PayChoice({ part, chosen, have, th, onPick }: { part: string; chosen: number; have: (id: ItemId) => number; th: boolean; onPick: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={th ? "จ่ายด้วย" : "Pay with"}>
      {PART[part].pay.map(([id, n], i) => (
        <button key={id} type="button" role="radio" aria-checked={i === chosen} onClick={() => onPick(i)}
                title={`${th ? ITEMS[id].name.th : ITEMS[id].name.en}${GOODS[id] ? (th ? ` · ร้านค้า ${GOODS[id]!.price} เหรียญ` : ` · shop ${GOODS[id]!.price} coins`) : ""}`}
                className={`pressable flex min-h-11 items-center gap-1 rounded-full border px-2.5 font-data text-meta tabular-nums ${i === chosen ? "border-accent bg-accent/10 text-ink" : "border-line text-muted"} ${have(id) < n ? "opacity-60" : ""}`}>
          <TownIcon name={icon(iconOf(id))} size={16} />{n}
          {GOODS[id] && <TownIcon name="coin" size={12} />}
        </button>
      ))}
    </div>
  );
}

/** A part's own picture, alone, at the largest whole zoom that fits the box (dyed when a colour is given). */
function PartPic({ id, size, color = 0 }: { id: string; size: number; color?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!drawPart(ctx, id, c.width, color)) krathongImage(() => setN((x) => x + 1));
  }, [id, n, color]);
  return <canvas ref={ref} width={size} height={size} aria-hidden className="[image-rendering:pixelated]" style={{ width: size, height: size }} />;
}

/** The lines of work a krathong carries, as icon dots. */
function Lines({ design, th }: { design: Design; th: boolean }) {
  const fams = familiesOf(design);
  return (
    <p className="mt-1.5 flex items-center gap-1 text-meta text-muted" title={th ? "สายที่ใช้" : "Lines used"}>
      {fams.map((f) => <TownIcon key={f} name={icon(FAMILY_ICON[f])} size={16} />)}
      <span className="ml-1 font-data tabular-nums">{th ? `ใช้ ${fams.length}/10 สาย` : `${fams.length}/10 lines`}</span>
    </p>
  );
}
const FAMILY_ICON: Record<string, string> = { farm: "marigold", forest: "fernTip", fishing: "snail", insects: "firefly", mining: "gemRuby", wood: "carvingBlank", kitchen: "sugar", animals: "feather", smith: "copperBlank", river: "hyacinth" };

function refusal(why: string, th: boolean, item?: ItemId): string {
  const T: Record<string, [string, string]> = {
    short: [`ของไม่พอ${item ? `: ${ITEMS[item]?.name.th ?? item}` : ""}`, `Not enough${item ? `: ${ITEMS[item]?.name.en ?? item}` : ""}`],
    made: ["ทำกระทงปีนี้ไปแล้ว", "You already made one this year"], closed: ["ซุ้มปิดรับแล้ว", "The stall is closed"],
    name: ["ตั้งชื่อก่อนนะ", "Give it a name"], design: ["ประกอบไม่ครบ", "Something's missing"],
    own: ["ให้กระทงตัวเองไม่ได้", "Not your own"], spent: ["popoto หมดแล้ว", "No popoto left"],
    away: ["ติดต่อเมืองไม่ได้ ลองอีกครั้ง", "Couldn't reach the town"],
  };
  const t = T[why] ?? ["ทำไม่ได้ตอนนี้", "Not now"];
  return th ? t[0] : t[1];
}

// ── the gallery ──

function Gallery({ keeper, th, st, me, admin, voting, phone, setSt }: {
  keeper: Keeper; th: boolean; st: KrathongState; me: string; admin: boolean; voting: boolean; phone: boolean;
  onChanged: () => Promise<void>; setSt: (s: KrathongState) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const shown = st.awards ? st.entries : shuffledFor(st.entries, me);
  const left = st.votesEach - st.voted.length;
  const vote = async (e: GalleryEntry) => {
    setBusy(e.id); setNote(null);
    const did = await keeper.krathongVote(e.id);
    setBusy(null);
    if (did.ok) setSt({ ...st, voted: did.voted });
    else setNote(refusal(did.why, th));
  };
  const voteWin = windowOf(st.festival, "vote");
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        {/* (the owner, 2026-11-24: "โหวต ให้โหวตได้ทุกคนในเกม": said so, with what is left or when it opens) */}
        {voting ? (
          <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-meta font-semibold text-accent" data-vote-state="open">
            {/* eslint-disable-next-line @next/next/no-img-element -- the site's own small popoto */}
            <img src={popotoArt.src} alt="" className="size-4" />{th ? `ทุกคนให้ได้ ${st.votesEach} ใบ · เหลือ ${left}` : `Everyone gives ${st.votesEach} · ${left} left`}
          </span>
        ) : !st.awards && voteWin && Date.parse(voteWin.from) > st.now ? (
          <span className="flex items-center gap-1.5 rounded-full bg-ink/[0.07] px-2.5 py-1 text-meta text-muted" data-vote-state="soon">
            {/* eslint-disable-next-line @next/next/no-img-element -- the site's own small popoto */}
            <img src={popotoArt.src} alt="" className="size-4" />{th ? `ทุกคนโหวตได้ · เปิด ${whenText(voteWin.from, th)}` : `Everyone votes · opens ${whenText(voteWin.from, th)}`}
          </span>
        ) : null}
        <span className="ml-auto text-meta text-muted">
          {admin ? (th ? "แอดมินเห็นคะแนน" : "Counts: admins only") : st.awards ? (th ? "เปิดชื่อแล้ว · ไม่โชว์คะแนน" : "Names shown · no counts") : (th ? "ซ่อนชื่อและคะแนน" : "Makers and counts hidden")}
        </span>
      </div>
      {note && <p className="text-meta text-[#fca5a5]" aria-live="polite">{note}</p>}
      {!shown.length && <p className="py-6 text-center text-meta text-muted">{th ? "ยังไม่มีกระทงส่งประกวด" : "No entries yet"}</p>}
      <div className={`grid gap-2 ${phone ? "grid-cols-2" : "grid-cols-2"}`}>
        {shown.map((e) => {
          const given = st.voted.includes(e.id);
          return (
            <div key={e.id} className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 pb-1.5 pt-2 ${e.mine ? "border-accent/60" : "border-line"} bg-card/60`}>
              <KrathongCanvas design={e.design} zoom={phone ? 2 : 3} water className="w-full py-1" />
              <p className="w-full truncate text-center text-ui font-semibold text-ink">{e.name}</p>
              {/* (no FC mark in the festival: the owner, 2026-11-24, "เอา FC นอก FC ออกเลย") */}
              <p className="flex min-h-5 items-center gap-1">
                {e.mine && <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-bg">{th ? "ของฉัน" : "Mine"}</span>}
                {e.maker?.name && <span className="max-w-[6rem] truncate text-[11px] text-muted">{e.maker.name}</span>}
              </p>
              {typeof e.votes === "number" && (
                <span className="flex items-center gap-1 rounded-full bg-[#e5cc80]/15 px-2 py-0.5 font-data text-meta tabular-nums text-[#e5cc80]" title={th ? "คะแนน · แอดมินเห็นคนเดียว" : "Count · admins only"}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the site's own small popoto */}
                  <img src={popotoArt.src} alt="" className="size-3.5" />{e.votes}
                </span>
              )}
              {voting && !e.mine ? (
                <button type="button" aria-pressed={given} disabled={busy !== null || (!given && left <= 0)} onClick={() => void vote(e)}
                        className={`pressable flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-ui font-semibold disabled:opacity-40 ${given ? "bg-accent text-bg" : "border border-line-strong text-ink hover:border-accent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the site's own small popoto */}
                  <img src={popotoArt.src} alt="" className="size-4" />{given ? (th ? "ให้แล้ว" : "Given") : (th ? "ให้ popoto" : "Give")}
                </button>
              ) : <span className="min-h-9" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── the float ──

function Float({ keeper, th, st, phone, onDone }: { keeper: Keeper; th: boolean; st: KrathongState; phone: boolean; onDone: () => void }) {
  const mine = st.mine!;
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setNote(null);
    const did = await keeper.krathongFloat(st.festival.id, wish);
    setBusy(false);
    if (did.ok) onDone(); else setNote(refusal(did.why, th));
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <KrathongCanvas design={mine.design} zoom={phone ? 3 : 4} water className="w-full py-3" />
      <p className="text-read font-semibold text-ink">{mine.name}</p>
      {mine.floated ? (
        <>
          <p className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-meta font-semibold text-accent"><TownIcon name={icon("floatKrathong")} size={16} />{th ? "ลอยแล้ว" : "Floated"}</p>
          {mine.wish && <p className="flex items-start gap-1.5 text-meta text-muted"><TownIcon name={icon("wishCapsule")} size={16} />{th ? "คำอธิษฐานผนึกไว้ เปิดอ่านได้ลอยกระทงปีหน้า" : "Your wish is sealed until next year's festival"}</p>}
        </>
      ) : (
        <>
          <label className="w-full">
            <span className="mb-1 flex items-center gap-1.5 text-meta text-muted"><TownIcon name={icon("wishCapsule")} size={16} />{th ? "คำอธิษฐาน · เห็นคนเดียว · เปิดอ่านปีหน้า" : "A wish · only you · opens next year"}</span>
            <textarea value={wish} onChange={(e) => setWish(e.target.value)} maxLength={140} rows={2}
                      className="w-full rounded-xl border border-line-strong bg-card/60 px-3 py-2 text-ui text-ink focus:border-accent focus:outline-none" />
          </label>
          {note && <p className="text-meta text-[#fca5a5]" aria-live="polite">{note}</p>}
          <button type="button" disabled={busy} onClick={() => void go()} className="pressable min-h-11 w-full rounded-xl bg-accent px-4 text-ui font-semibold text-bg disabled:opacity-40">
            {th ? "ลอยกระทง" : "Float it"}
          </button>
        </>
      )}
      {st.capsule.length > 0 && (
        <div className="w-full rounded-xl border border-line bg-card/60 p-3">
          {st.capsule.map((c) => (
            <p key={c.year} className="flex items-start gap-2 text-meta text-ink"><TownIcon name={icon("wishCapsule")} size={18} /><span><b>{c.year}</b> · {c.wish}</span></p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── the results ──

/**
 * The lucky draw's list, for an admin (Aqua's event, 2026-11-24: a verified member who made a krathong and floated it
 * may be drawn): how many are in, until when, every maker who floated with their krathong, FC or not, and when; the
 * names copied in one tap, one a line, for the drawing.
 */
function Draw({ keeper, th, festival }: { keeper: Keeper; th: boolean; festival: number }) {
  const [d, setD] = useState<DrawList | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let gone = false;
    const read = async () => { const got = await keeper.festivalDraw?.(festival); if (!gone) setD(got ?? null); };
    void read();
    const t = setInterval(() => { if (document.visibilityState === "visible") void read(); }, 30_000);
    return () => { gone = true; clearInterval(t); };
  }, [keeper, festival]);
  if (d === undefined) return <p className="py-8 text-center text-meta text-muted">{th ? "กำลังอ่านรายชื่อ…" : "Reading…"}</p>;
  if (d === null) return <p className="py-8 text-center text-meta text-muted">{th ? "อ่านรายชื่อไม่ได้" : "The list could not be read"}</p>;
  const inTime = d.list.filter((r) => r.inTime);
  const who = (r: DrawList["list"][number]) => r.maker.name ?? r.name;
  const copy = async () => {
    const text = inTime.map(who).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  };
  return (
    <div className="flex flex-col gap-3" data-draw-list>
      <div className="flex items-center gap-3 rounded-xl border border-[#e5cc80]/40 bg-[#e5cc80]/[0.07] p-3">
        <TownIcon name={icon("krathongTrophy")} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-data text-title font-semibold tabular-nums text-ink">{inTime.length}<span className="text-meta text-muted"> / {d.list.length}</span></p>
          <p className="text-meta text-muted">{th ? "ทำและลอยแล้ว" : "Made and floated"}{d.until ? ` · ${th ? "ก่อน" : "before"} ${whenText(new Date(d.until).toISOString(), th)}` : ""}</p>
        </div>
        <button type="button" disabled={!inTime.length} onClick={() => void copy()}
                className="pressable min-h-11 shrink-0 rounded-xl bg-accent px-3 text-ui font-semibold text-bg disabled:opacity-40">
          {copied ? (th ? "คัดลอกแล้ว" : "Copied") : (th ? "คัดลอกรายชื่อ" : "Copy names")}
        </button>
      </div>
      {!d.list.length && <p className="py-4 text-center text-meta text-muted">{th ? "ยังไม่มีใครลอยกระทง" : "Nobody has floated yet"}</p>}
      <ol className="flex flex-col gap-1.5">
        {d.list.map((r, i) => (
          <li key={r.id} data-draw-in={r.inTime} className={`flex items-center gap-2 rounded-xl border border-line px-2 py-1.5 ${r.inTime ? "" : "opacity-50"}`}>
            <span className="w-6 shrink-0 text-center font-data text-meta tabular-nums text-muted">{i + 1}</span>
            <KrathongCanvas design={r.design} zoom={1} still className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-ui font-semibold text-ink">
                {/* (the draw is one for all, FC or not: the owner, 2026-11-24, "ลุ้นรางวัลไม่แบ่งแยก fc นอกfc") */}
                <span className="truncate">{who(r)}</span>
                {!r.verified && <span className="shrink-0 rounded-full bg-[#f87171]/15 px-1.5 py-px text-[11px] font-semibold text-[#fca5a5]">{th ? "ไม่ยืนยัน" : "Unverified"}</span>}
              </p>
              <p className="truncate font-data text-[11px] tabular-nums text-muted">
                {r.name} · {th ? "ลอย" : "floated"} {whenText(new Date(r.floated).toISOString(), th)}{r.inTime ? "" : (th ? " · หลังหมดเวลา" : " · too late")}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Results({ th, awards, phone, mine }: { th: boolean; awards: AwardView[]; phone: boolean; mine: number | null }) {
  if (!awards.length) return <p className="py-6 text-center text-meta text-muted">{th ? "ปีนี้ไม่มีผู้ได้รางวัล" : "No awards this year"}</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {awards.map((a) => <AwardCard key={`${a.kind}-${a.entry}`} a={a} th={th} phone={phone} mine={a.entry === mine} />)}
    </div>
  );
}

function AwardCard({ a, th, phone, mine }: { a: AwardView; th: boolean; phone: boolean; mine: boolean }) {
  const [face, setFace] = useState<string | null>(null);
  useEffect(() => {
    if (!a.maker?.character) return;
    let gone = false;
    fetch(`/api/face/${a.maker.character}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (!gone && j?.avatar) setFace(j.avatar); }).catch(() => {});
    return () => { gone = true; };
  }, [a.maker?.character]);
  const gold = a.kind === "popular" && a.place === 1;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-2.5 ${gold ? "border-[#e5cc80]/70 bg-[#e5cc80]/[0.07]" : "border-line bg-card/60"} ${mine ? "ring-1 ring-accent" : ""}`}>
      <KrathongCanvas design={a.krathong.design} zoom={phone ? 2 : 3} water className="shrink-0 px-1 py-1" />
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1 text-meta font-semibold ${gold ? "text-[#e5cc80]" : "text-accent"}`}>
          <TownIcon name={icon("krathongTrophy")} size={16} />{th ? a.title.th : a.title.en}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- the member's own Lodestone portrait */}
          {face ? <img src={face} alt="" className="size-9 shrink-0 rounded-full border border-line-strong object-cover" /> : <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/10 font-display text-ui font-semibold text-muted">{[...(a.maker?.name ?? "?")][0]}</span>}
          <div className="min-w-0">
            <p className="truncate text-ui font-semibold text-ink">{a.maker?.name ?? "—"}</p>
            <p className="truncate text-[11px] text-muted">{a.krathong.name}</p>
          </div>
        </div>
        <p className="mt-1 flex items-center gap-1 font-data text-meta tabular-nums text-muted">
          {a.kind === "popular" && <span>{th ? `อันดับ ${a.place}` : `#${a.place}`}</span>}
          {typeof a.votes === "number" && (
            <span className="ml-1 flex items-center gap-1 text-[#e5cc80]" title={th ? "คะแนน · แอดมินเห็นคนเดียว" : "Count · admins only"}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the site's own small popoto */}
              <img src={popotoArt.src} alt="" className="size-3.5" />{a.votes}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
