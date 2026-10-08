"use client";

import { WISH } from "@/lib/town/fountain";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BAITS, BUFFS, CROPS, CROP_IDS, DISHES, FISH, ITEMS, ITEM_IDS, MAKES, SCROLLS, STAGES, STAGE_AT, growIconOf, isDish,
  type BaitId, type CropId, type FishId, type ItemId, type ItemKind,
} from "@/lib/town/items";
import { PUT_ON, WATER } from "@/lib/town/farm";
import { ALL_GIFTS, giftOf, giftsOf, type CharmId } from "@/lib/town/gifts";
import { ALL_LINE_IDS, LINES, rankOf } from "@/lib/town/lines";
import { CARRIES, COOK_EASE, FIELD, KITCHEN_GEAR, RODS, TACKLE, isRod } from "@/lib/town/gear";
import { HINT_IDS, HINT_PRICE, hintOf } from "@/lib/town/hints";
import { BASIC, UNLOCKS } from "@/lib/town/orders";
import { INSIDE } from "@/lib/town/scrolls";
import { sources, usesOf } from "@/lib/town/uses";
import type { FishingPlay, Play, Tally, WorkPlay } from "@/lib/town/plays";
import { STAMINA, staminaOf } from "@/lib/town/stamina";
import { GOODS, handOf, held, roomFor } from "@/lib/town/trade";
import { trialFor } from "@/lib/town/trial";
import { WELL } from "@/lib/town/world";
import TownIcon, { ICON_ATLAS, type IconName } from "./TownIcon";
import { Coins, ItemCard, ItemIcon } from "./TownTrade";

const KINDS: Array<[ItemKind | "all", string, string]> = [
  ["all", "ทั้งหมด", "All"], ["tool", "เครื่องมือ", "Tools"], ["bait", "เหยื่อ", "Bait"], ["staple", "ของคู่ครัว", "Staples"], ["seed", "เมล็ด", "Seeds"],
  ["crop", "ผัก", "Vegetables"], ["fish", "ปลา", "Fish"], ["catch", "ของจากน้ำ", "Flotsam"], ["wild", "ของป่า", "Forest"], ["bug", "แมลง", "Insects"], ["goods", "ของแปรรูป", "Goods"], ["dish", "อาหาร", "Dishes"], ["scroll", "ม้วนสูตร", "Scrolls"],
  ["wood", "ไม้", "Wood"], ["mineral", "หินและแร่", "Stone and ore"],
];
type View = "things" | "plants" | "me" | "plays";
/** What each stage of a plant's growing is called. */
const STAGE_NAMES: Array<[string, string]> = [["เมล็ด", "Sown"], ["ต้นอ่อน", "Sprout"], ["ต้นกล้า", "Seedling"], ["กำลังโต", "Half grown"], ["โตเต็มที่", "Ripe"]];
/** So many hours, in the words a person would use: minutes, hours, or days. */
const span = (h: number, th: boolean) => (h < 1 ? `${Math.round(h * 60)} ${th ? "นาที" : "min"}` : h < 48 ? `${+h.toFixed(1)} ${th ? "ชม." : "h"}` : `${+(h / 24).toFixed(1)} ${th ? "วัน" : "d"}`);
const hours = (spans: Array<[number, number]>) => spans.map(([a, b]) => `${String(a).padStart(2, "0")}–${String(b).padStart(2, "0")}`).join(", ");
const clock = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t));

/**
 * The test window (the owner, 2026-10-03: "ช่วยสร้าง Icon test ที่สามารถ เลือกดู และเสก
 * item ทุกอย่างในเกมได้ให้ผมหน่อย"): every thing there is, to look at with all its
 * numbers and to conjure into the bag; what else trying things needs (coins,
 * stamina, the bag's size, the clock); and the record of every go at the
 * mini-games. It tells everything, which the game itself does not: it is the
 * owner's, for the trial, and only in \`next dev\`.
 */
export default function TownTest({ me, name: called, th, onClose }: { me: string; name: string; th: boolean; onClose: () => void }) {
  const trial = useMemo(() => trialFor(me), [me]);
  const [, setTick] = useState(0);
  useEffect(() => trial.watch(() => setTick((n) => n + 1)), [trial]);
  const [view, setView] = useState<View>("things");
  const [kind, setKind] = useState<ItemKind | "all">("all");
  const [picked, setPicked] = useState<ItemId>("rod");
  /** Which tier to show: 0 all, 1 the early game, 2 and 3 what comes after. */
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0);
  const [said, setSaid] = useState<string | null>(null);

  const now = trial.now(), purse = trial.purse();
  const ids = ITEM_IDS.filter((id) => (kind === "all" || ITEMS[id].kind === kind) && (!tier || ITEMS[id].tier === tier));
  const name = (id: ItemId) => (th ? ITEMS[id].name.th : ITEMS[id].name.en);
  const conjure = (id: ItemId, n: number) => {
    const room = roomFor(trial.purse().bag, id), put = Math.min(n, room);
    if (put > 0) trial.grant(id, put);
    setSaid(put === n ? (th ? `เสก ${name(id)} ×${put} ใส่กระเป๋าแล้ว` : `Conjured ${put} × ${name(id)}`)
      : put ? (th ? `ใส่ได้แค่ ${put} กระเป๋าเต็ม` : `Only ${put} fitted: the bag is full`)
        : (th ? "กระเป๋าเต็ม ขยายช่องหรือล้างกระเป๋าที่แท็บ \"ตัวฉัน\"" : "The bag is full: give it more slots or empty it, under \"Me\""));
  };

  return (
    <section aria-labelledby="town-test-h" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="rounded-full bg-gold/20 px-2 py-0.5 font-data text-label font-semibold uppercase tracking-wider text-gold">Test</span>
        <h2 id="town-test-h" className="min-w-0 truncate font-display text-title font-semibold text-ink">{th ? "ของทุกอย่างในเกม" : "Everything in the game"}</h2>
        <button type="button" onClick={onClose} className="pressable ml-auto rounded-full bg-accent px-4 py-1.5 text-ui font-semibold text-bg">{th ? "ปิด" : "Close"}</button>
      </div>
      <div role="tablist" className="flex gap-1 border-b border-line px-3 pt-2">
        {([["things", th ? `ของ (${ITEM_IDS.length})` : `Things (${ITEM_IDS.length})`], ["plants", th ? `พืช (${CROP_IDS.length})` : `Plants (${CROP_IDS.length})`], ["me", th ? "ตัวฉัน" : "Me"], ["plays", th ? "ประวัติมินิเกม" : "Plays"]] as const).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                  className={`pressable -mb-px rounded-t-lg border-b-2 px-3 py-2 text-ui font-semibold ${view === v ? "border-gold text-gold" : "border-transparent text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="min-h-[1.75em] px-4 pt-1.5 text-meta text-accent" aria-live="polite">{said ?? ""}</p>

      {view === "things" && (
        <>
          <div className="flex flex-wrap items-center gap-1 px-4 pb-1.5">
            {([0, 1, 2, 3] as const).map((n) => (
              <button key={n} type="button" aria-pressed={tier === n} onClick={() => setTier(n)}
                      className={`pressable rounded-full border px-2.5 py-1 text-meta ${tier === n ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line-strong text-ink hover:border-accent"}`}>
                {n === 0 ? (th ? "ทุกช่วง" : "All tiers") : n === 1 ? (th ? "ต้นเกม" : "Early") : n === 2 ? (th ? "กลางเกม" : "Middle") : (th ? "ปลายเกม" : "Late")}
              </button>
            ))}
            <span className="ml-auto font-data text-meta tabular-nums text-muted">{ids.length}</span>
          </div>
          <div className="flex flex-wrap gap-1 px-4 pb-2">
            {KINDS.map(([k, t, e]) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                      className={`pressable rounded-full border px-2.5 py-1 text-meta ${kind === k ? "border-gold bg-gold/15 font-semibold text-gold" : "border-line-strong text-ink hover:border-gold"}`}>
                {th ? t : e}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-14">
            <ul className="grid grid-cols-6 gap-1.5">
              {ids.map((id, i) => (
                <li key={id} className="relative hover:z-20 focus-within:z-20">
                  <button type="button" onClick={() => setPicked(id)} onDoubleClick={() => conjure(id, 1)} aria-pressed={picked === id} aria-label={name(id)}
                          className={`group pressable relative grid aspect-square w-full place-items-center rounded-xl border-2 bg-[#33251a] ${picked === id ? "border-gold" : "border-[#6b4a2a] hover:border-[#c9a877]"}`}>
                    <ItemIcon id={id} size={30} />
                    {held(purse.bag, id) > 0 && <span className="absolute bottom-0 right-1 font-data text-label font-semibold tabular-nums text-[#f3e3c3] [text-shadow:0_1px_2px_#000]">{held(purse.bag, id)}</span>}
                    <ItemCard id={id} th={th} at={((i % 6) + 0.5) / 6} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Detail id={picked} th={th} have={held(purse.bag, picked)} knows={isDish(picked) && purse.recipes.includes(picked)}
                  onConjure={(n) => conjure(picked, n)}
                  onLearn={isDish(picked) && DISHES[picked].recipe ? () => { trial.learn(picked); setSaid(th ? "จดสูตรลงสมุดแล้ว" : "Written in the recipe book"); } : undefined} />
        </>
      )}

      {view === "plants" && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          <Row label={th ? "แปลงตัวอย่าง รอบบ่อน้ำ" : "A show garden, round the well"} value={<span className="text-meta text-muted">{th ? `${CROP_IDS.length} ชนิด × ${STAGES} ระยะ` : `${CROP_IDS.length} plants × ${STAGES} stages`}</span>}>
            <Do onClick={() => {
              trial.showGarden(called);
              // (the map's own handle, in `next dev`: beside the well, where the four beds meet)
              (window as unknown as { __townView?: { warp: (x: number, y: number) => boolean } }).__townView?.warp(WELL.x + 1, WELL.y - 1);
              setSaid(th ? "ปลูกแล้ว พาไปยืนข้างบ่อน้ำ แถวละชนิด ไล่จากเมล็ดไปถึงโตเต็มที่" : "Planted. You stand by the well: a row to each plant, from sown to ripe.");
            }}>{th ? "ปลูกทุกชนิดทุกระยะ แล้วพาไปดู" : "Plant them all, and go there"}</Do>
            <Do onClick={() => { trial.clearFarm(); setSaid(th ? "ล้างแปลงผักทั้งหมดแล้ว" : "The whole farm is weeds again"); }}>{th ? "ล้างแปลงผักทั้งหมด" : "Clear the whole farm"}</Do>
          </Row>
          <Row label={th ? "นาฬิกาของโหมดลอง" : "The trial's clock"} value={<span className="font-data text-ink">{clock(now)}</span>}>
            {([[1, "+1 ชม.", "+1 h"], [6, "+6 ชม.", "+6 h"], [24, "+1 วัน", "+1 d"], [168, "+7 วัน", "+7 d"]] as const).map(([h, t, e]) => <Do key={h} onClick={() => trial.skipHours(h)}>{th ? t : e}</Do>)}
          </Row>
          <ul>
            {CROP_IDS.map((c) => {
              const crop = CROPS[c];
              return (
                <li key={c} className="border-b border-line py-2.5">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui">
                    <ItemIcon id={c} size={22} className="shrink-0" />
                    <span className="font-semibold text-ink">{name(c)}</span>
                    <span className="text-meta text-muted">
                      {th ? `โตใน ${span(crop.hours, true)} · เก็บได้ ${crop.yield[0]}–${crop.yield[1]}` : `ripe in ${span(crop.hours, false)} · yields ${crop.yield[0]}–${crop.yield[1]}`}
                      {crop.again ? (th ? ` · เก็บแล้วกลับไประยะ 4 อีก ${span(crop.again, true)} เก็บได้ใหม่ รวม ${crop.picks} รอบ` : ` · picked, back to stage 4, ripe again in ${span(crop.again, false)}, ${crop.picks} picks in all`) : ""}
                    </span>
                  </p>
                  <ol className="mt-1.5 grid grid-cols-5 gap-1.5">
                    {STAGE_NAMES.map(([t, e], i) => {
                      const icon = growIconOf(c, i + 1) as IconName, cell = ICON_ATLAS.icons[icon];
                      return (
                        <li key={i} className="flex flex-col items-center rounded-xl border-2 border-[#6b4a2a] bg-[#33251a] px-1 pb-1 pt-1.5" title={icon}>
                          <span className="grid h-[4.5rem] place-items-end">{cell && <TownIcon name={icon} size={Math.max(cell[2], cell[3]) * 1.35} />}</span>
                          <span className="mt-1 text-center text-label leading-tight text-[#f3e3c3]">{i + 1} {th ? t : e}</span>
                          <span className="font-data text-label tabular-nums text-[#c9a877]">{i ? span(STAGE_AT[i] * crop.hours, th) : (th ? "ตอนหว่าน" : "when sown")}</span>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {view === "me" && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          <Row label={th ? "Popoto coin" : "Popoto coins"} value={<Coins n={purse.coins} th={th} />}>
            {[100, 1000].map((n) => <Do key={n} onClick={() => trial.grant("rod", 0, n)}>+{n}</Do>)}
          </Row>
          <Row label="Stamina" value={<span className="font-data tabular-nums text-ink">{Math.round(staminaOf(purse, now))} / {STAMINA.max}</span>}>
            <Do onClick={() => trial.setStamina(0)}>{th ? "หมด (0)" : "None"}</Do>
            <Do onClick={() => trial.setStamina(10)}>10</Do>
            <Do onClick={() => trial.setStamina(STAMINA.max)}>{th ? "เต็ม" : "Full"}</Do>
          </Row>
          <Row label={th ? "ช่องกระเป๋า" : "Bag slots"} value={<span className="font-data tabular-nums text-ink">{purse.bag.filter(Boolean).length} / {purse.bag.length}</span>}>
            {[5, 10, 15, 20].map((n) => (
              <Do key={n} on={purse.bag.length === n} onClick={() => { if (!trial.resize(n)) setSaid(th ? "ลดช่องไม่ได้ ช่องท้ายๆ ยังมีของอยู่" : "Cannot shrink: the last slots are not empty"); }}>{n}</Do>
            ))}
            <Do onClick={() => { trial.empty(); setSaid(th ? "ล้างกระเป๋าแล้ว" : "Bag emptied"); }}>{th ? "ล้างกระเป๋า" : "Empty it"}</Do>
          </Row>
          <Row label={th ? "นาฬิกาของโหมดลอง" : "The trial's clock"} value={<span className="font-data text-ink">{clock(now)}</span>}>
            {[1, 3, 6, 12].map((h) => <Do key={h} onClick={() => trial.skipHours(h)}>+{h} {th ? "ชม." : "h"}</Do>)}
          </Row>
          {/* the lines of work and the gifts of their ranks: points to reach a rank, every charm at once, and what is worn */}
          <Row label={th ? "แต้มสายอาชีพ" : "Points on the lines"} value={<span className="font-data text-meta tabular-nums text-ink">{ALL_LINE_IDS.map((id) => `${th ? LINES[id].name.th.replace("สาย", "") : LINES[id].name.en.replace("The ", "")} ${rankOf(id, trial.lines().lines[id].points)}`).join(" · ")}</span>}>
            {[0, 60, 400, 12000].map((n) => <Do key={n} onClick={() => { for (const id of ALL_LINE_IDS) if (id !== "well") trial.setLine(id, n); setSaid(th ? `ตั้งทุกสายเป็น ${n} แต้มแล้ว (ยกเว้นหาบน้ำ ซึ่งนับเป็นถัง)` : `Every line set to ${n} points (but the well's, which counts buckets)`); }}>{n}</Do>)}
          </Row>
          <Row label={th ? "เครื่องราง" : "Charms"} value={<span className="text-meta text-ink">{(() => { const g = giftsOf(purse); return `${th ? "มี" : "have"} ${g.had.length} / ${ALL_GIFTS.length} · ${th ? "ใส่" : "worn"}: ${g.charms.map((id) => (th ? giftOf(id)?.name.th : giftOf(id)?.name.en)).join(", ") || "–"}`; })()}</span>}>
            <Do onClick={() => { trial.setGifts(true); setSaid(th ? "ได้เครื่องรางครบทุกชิ้นแล้ว ไปใส่ได้ที่ ตัวฉัน (แตะตัวเอง หรือปุ่มสายอาชีพ)" : "You have every charm: wear them under Me (tap yourself, or the lines' button)"); }}>{th ? "ได้ครบทุกชิ้น" : "Have them all"}</Do>
            {ALL_GIFTS.filter((g) => g.kind === "charm").map((g) => {
              const worn = giftsOf(purse).charms, on = worn.includes(g.id as CharmId);
              return (
                <Do key={g.id} on={on} onClick={() => {
                  if (!giftsOf(purse).had.includes(g.id)) trial.setGifts(true);
                  const did = trial.charmsWear(on ? worn.filter((id) => id !== g.id) : [...worn, g.id].slice(-2));
                  if (!did.ok) setSaid(th ? "ใส่ไม่ได้" : "That could not be worn");
                }}><span className="flex items-center gap-1"><TownIcon name={g.id as IconName} size={16} />{th ? g.name.th : g.name.en}</span></Do>
              );
            })}
            <Do onClick={() => { trial.setGifts(false); setSaid(th ? "ล้างเครื่องรางและภูตแล้ว" : "Charms and familiars cleared"); }}>{th ? "ล้าง" : "Clear"}</Do>
          </Row>
          <Row label={th ? "ภูตคู่ใจ" : "A familiar"} value={<span className="text-meta text-ink">{(() => { const id = giftsOf(purse).familiar; return id ? (th ? giftOf(id)?.name.th : giftOf(id)?.name.en) : "–"; })()}</span>}>
            {ALL_GIFTS.filter((g) => g.kind === "familiar").map((g) => {
              const on = giftsOf(purse).familiar === g.id;
              return (
                <Do key={g.id} on={on} onClick={() => {
                  if (!giftsOf(purse).had.includes(g.id)) trial.setGifts(true);
                  const did = trial.familiarWear(on ? null : g.id);
                  if (!did.ok) setSaid(th ? "เรียกไม่ได้" : "It would not come");
                }}><span className="flex items-center gap-1"><TownIcon name={g.id as IconName} size={16} />{th ? g.name.th : g.name.en}</span></Do>
              );
            })}
          </Row>
          {/* ── felling ── (the mountain is `next dev`'s only: an axe to hold, as forged as one likes; going to its trees at once; and the trees' clock) */}
          {process.env.NODE_ENV === "development" && (
            <Row label={th ? "ตัดไม้" : "Woodcutting"} value={<span className="font-data text-meta tabular-nums text-ink">{(() => { const i = purse.bag.findIndex((s) => s?.item === "axe"), s = i >= 0 ? purse.bag[i] : null; return s ? `+${s.plus ?? 0}${s.opts?.length ? ` · ${s.opts.filter(Boolean).join(" ")}` : ""}${s.gems?.length ? ` · ${s.gems.join(" ")}` : ""}` : "–"; })()}</span>}>
              {([[0, [], []], [5, ["axKeen"], []], [10, ["axGrain", "axDust", "axOne"], ["fire"]], [10, ["axKeen", "axResin", "axDouble"], ["water"]], [10, ["axFresh", "axGrain", "axRoot"], ["lightning"]], [10, ["axDust", "axKeen", "axElder"], ["light"]]] as Array<[number, string[], string[]]>).map(([plus, opts, gems], k) => (
                <Do key={k} onClick={() => {
                  let i = trial.purse().bag.findIndex((s) => s?.item === "axe");
                  if (i < 0) { trial.grant("axe", 1); i = trial.purse().bag.findIndex((s) => s?.item === "axe"); }
                  if (i < 0) { setSaid(th ? "กระเป๋าเต็ม" : "The bag is full"); return; }
                  trial.setTool(i, plus, opts, gems); trial.hold(i);
                  setSaid(th ? `ถือขวาน +${plus} แล้ว` : `An axe at +${plus} is in your hand`);
                }}>{`+${plus}${opts[2] ? ` ${opts[2].slice(2)}` : ""}${gems[0] ? ` ${gems[0]}` : ""}`}</Do>
              ))}
              {["slope", "cedar", "upper"].map((to) => (
                <Do key={to} onClick={() => { const more = (window as unknown as { __townMore?: { go: (name: string) => boolean } }).__townMore; if (!more?.go(to)) setSaid(th ? "ไปไม่ได้" : "Cannot go there"); }}>{to}</Do>
              ))}
              <Do onClick={() => { trial.skipHours(10 / 60); setSaid(th ? "เลื่อนเวลา 10 นาที" : "Ten minutes on"); }}>+10m</Do>
              <Do onClick={() => { trial.setTrees(null); setSaid(th ? "ต้นไม้โตครบทุกต้นแล้ว" : "Every tree is grown again"); }}>{th ? "ต้นไม้โตครบ" : "Regrow all"}</Do>
            </Row>
          )}
          <Row label={th ? "ถืออยู่ในมือ" : "In the hand"} value={<span className="text-ink">{handOf(purse) ? name(handOf(purse)!) : "–"}</span>}>
            <Do onClick={() => trial.letGo()}>{th ? "เก็บ" : "Put away"}</Do>
          </Row>
          <Row label={th ? "บ่อน้ำแปลงผัก" : "The farm's well"} value={<span className="font-data tabular-nums text-ink">{trial.well()} / {WATER.well}</span>}>
            {[0, 5, WATER.well].map((n) => <Do key={n} onClick={() => trial.setWell(n)}>{n}</Do>)}
          </Row>
          <Row label={th ? "ของที่ร้านลุงเปิดขาย" : "Open on the uncle's shelf"} value={<span className="font-data tabular-nums text-ink">{BASIC.length} + {trial.village().unlocked} / {UNLOCKS.length}</span>}>
            <Do onClick={() => trial.setUnlocked(0)}>{th ? "แค่ของพื้นฐาน" : "Basic only"}</Do>
            <Do onClick={() => trial.setUnlocked(trial.village().unlocked + 1)}>+1</Do>
            <Do onClick={() => trial.setUnlocked(UNLOCKS.length)}>{th ? "ทั้งหมด" : "All"}</Do>
          </Row>
          <Row label={th ? "สูตรที่รู้" : "Recipes known"} value={<span className="font-data tabular-nums text-ink">{purse.recipes.length}</span>}>
            <Do onClick={() => { for (const d of Object.keys(DISHES) as Array<keyof typeof DISHES>) if (DISHES[d].recipe) trial.learn(d); }}>{th ? "รู้ทุกสูตร (เท่าที่ม้วนสูตรบอก)" : "Know them all (as a scroll tells)"}</Do>
            <Do onClick={() => { for (const d of Object.keys(DISHES) as Array<keyof typeof DISHES>) if (DISHES[d].recipe) trial.learn(d, true); }}>{th ? "เคยทำทุกสูตรแล้ว (เห็นครบ)" : "Made them all (in full)"}</Do>
          </Row>
          <Row label={th ? "เริ่มโหมดลองใหม่" : "Begin the trial again"} value={<span className="text-meta text-muted">{th ? "กระเป๋า เงิน แผงลุง นาฬิกา" : "Bag, coins, stall, clock"}</span>}>
            <Do onClick={() => { trial.reset(); setSaid(th ? "เริ่มใหม่แล้ว (ประวัติมินิเกมยังอยู่)" : "Begun again (the plays stay)"); }}>{th ? "เริ่มใหม่" : "Begin again"}</Do>
          </Row>
        </div>
      )}

      {view === "plays" && <Plays th={th} tally={trial.tally()} log={trial.plays()} onForget={() => { trial.forget(); setSaid(th ? "ล้างประวัติแล้ว" : "The record is wiped"); }} />}

      <p className="flex items-center gap-2 border-t border-line bg-bg/40 px-4 py-2 text-meta text-muted">
        <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 font-data text-label uppercase tracking-wider text-gold">{th ? "โหมดลอง" : "Trial"}</span>
        <span className="min-w-0">{th ? "หน้าต่างนี้มีเฉพาะใน dev บอกทุกอย่างที่ตัวเกมไม่บอก" : "Only in dev. It tells what the game itself does not."}</span>
      </p>
    </section>
  );
}

/** Where every thing comes from, worked out once. */
const SOURCES = sources();

/** One thing, with all there is to know of it, and the ways to conjure it. */
function Detail({ id, th, have, knows, onConjure, onLearn }: {
  id: ItemId; th: boolean; have: number; knows: boolean; onConjure: (n: number) => void; onLearn?: () => void;
}) {
  const it = ITEMS[id], name = (x: ItemId) => (th ? ITEMS[x].name.th : ITEMS[x].name.en);
  const facts: Array<[string, string]> = [[th ? "ช่วงเกม" : "Tier", String(it.tier)], [th ? "กองละ" : "Stack", String(it.stack)], [th ? "ญาติลุงรับ" : "Fetches", it.pays ? `${it.pays} coin` : (th ? "ไม่รับ" : "not taken")]];
  const g = GOODS[id];
  if (g) facts.push([th ? "ลุงขาย" : "The uncle sells", th ? `${g.price} coin · ${g.stock} ชิ้นต่อรอบ · คนละ ${g.each}` : `${g.price} coins · ${g.stock} a round · ${g.each} each`]);
  if (isRod(id)) facts.push([th ? "คันเบ็ด" : "Rod", `band ×${RODS[id].band} · pace ×${RODS[id].pace}`]);
  const tackle = TACKLE[id];
  if (tackle) facts.push([th ? "อุปกรณ์ตกปลา" : "Tackle", Object.entries(tackle).map(([k, v]) => `${k} ×${v}`).join(" · ")]);
  if (CARRIES[id]) facts.push([th ? "กระเป๋า" : "Bag", `+${CARRIES[id]}`]);
  if (FIELD[id]) facts.push([th ? "งานแปลง" : "Field work", `×${FIELD[id]}`]);
  if (KITCHEN_GEAR[id]) facts.push([th ? "ครัว" : "Kitchen", `×${KITCHEN_GEAR[id]}`]);
  if (COOK_EASE[id]) facts.push([th ? "คนอาหารง่ายขึ้น" : "Stirring", `×${COOK_EASE[id]}`]);
  if (WATER.cans[id]) facts.push([th ? "รดน้ำได้ต่อการเติม" : "Waterings a filling", String(WATER.cans[id])]);
  if (WATER.buckets[id]) facts.push([th ? "ตักน้ำได้" : "Carries", th ? `${WATER.buckets[id]} ถัง` : `${WATER.buckets[id]} bucketful(s)`]);
  if (PUT_ON[id]) facts.push([th ? "วางที่ต้นผัก" : "Put on a plant", PUT_ON[id]!]);
  const uses = usesOf(id);
  if (uses.length) facts.push([th ? "ใช้ทำ" : "Used as", uses.join(" · ")]);
  facts.push([th ? "ได้มาจาก" : "Comes from", SOURCES.get(id) ?? "–"]);
  if (GOODS[id]) facts.push([th ? "ร้านลุงเปิดขาย" : "On the shelf", BASIC.includes(id) ? (th ? "ตั้งแต่วันแรก" : "from the first day") : (th ? `ปลดล็อกลำดับที่ ${UNLOCKS.indexOf(id) + 1}` : `opened ${UNLOCKS.indexOf(id) + 1}`)]);
  const make = MAKES[id];
  if (make) facts.push([th ? "ทำจาก" : "Made of", `${make.needs.map(([x, n]) => `${name(x)} ×${n}`).join(", ")} → ${make.in.length ? make.in.map((tool) => name(tool)).join(" + ") : (th ? "มือเปล่า ที่โต๊ะ" : "bare hands, at a worktable")} · ×${make.gives}`]);
  if (HINT_IDS.includes(id)) facts.push([th ? `คำใบ้ (${HINT_PRICE[it.tier]} coin)` : `Hint (${HINT_PRICE[it.tier]} coins)`, th ? hintOf(id).th : hintOf(id).en]);
  if (BAITS.includes(id as BaitId)) {
    const takers = (Object.keys(FISH) as FishId[]).filter((f) => FISH[f].baits[id as BaitId]).map((f) => `${name(f)} ×${FISH[f].baits[id as BaitId]}`);
    facts.push([th ? "เกี่ยวเบ็ดได้" : "Goes on a hook", takers.join(", ")]);
  }
  if (id in FISH) {
    const f = FISH[id as FishId], q = f.fight;
    facts.push(
      [th ? "ระดับ" : "Tier", f.tier],
      [th ? "กินเหยื่อ" : "Takes", (Object.keys(f.baits) as BaitId[]).map((b) => `${name(b)} ×${f.baits[b]}`).join(", ")],
      [th ? "ชั่วโมง" : "Hours", hours(f.hours)], [th ? "ฝน" : "Rain", `×${f.rain}`],
      [th ? "ฟ้าไม่ฝน" : "Dry", `×${f.dry ?? 1}`], [th ? "น้ำ" : "Water", f.water ?? (f.tier === "common" ? (th ? "ตลิ่งและลาน" : "bank and deck") : "deck")],
      [th ? "รอสัญญาณ" : "Waits for", f.needs?.join(", ") ?? "–"],
      [th ? "รอ" : "Wait", `${f.wait[0]}–${f.wait[1]} s`], [th ? "ยาว" : "Length", `${f.size[0]}–${f.size[1]} cm`],
      [th ? "วิธีสู้" : "Fights", `${q.style} · band ${q.band} · sway ${q.sway} · pace ${q.pace}`],
      [th ? "แรง" : "Pull", `${q.pull} · surge ${q.surge} · every ${q.every[0]}–${q.every[1]} s`],
      [th ? "สาย / stamina" : "Line / stamina", `${q.line} · ${q.effort}`],
    );
  }
  if (id in CROPS) {
    const c = CROPS[id as CropId];
    facts.push([th ? "ปลูกจาก" : "Grown from", name(c.seed)], [th ? "โต" : "Ripe in", `${c.hours} h`], [th ? "เก็บได้" : "Yield", `${c.yield[0]}–${c.yield[1]}`]);
    if (c.again) facts.push([th ? "เก็บซ้ำ" : "Bears again", th ? `ทุก ${c.again} ชม. รวม ${c.picks} รอบ` : `every ${c.again} h, ${c.picks} picks in all`]);
  }
  const grows = CROP_IDS.find((c) => CROPS[c].seed === id);
  if (grows) facts.push([th ? "ปลูกได้" : "Grows", `${name(grows)} · ${CROPS[grows].hours} h`]);
  if (isDish(id)) {
    const d = DISHES[id];
    facts.push(["Stamina", `+${d.stamina}`]);
    if (d.buff) facts.push(["Buff", `${th ? WISH[d.buff].name.th : WISH[d.buff].name.en}: ${th ? WISH[d.buff].about.th : WISH[d.buff].about.en}`]);
    facts.push([th ? "สูตร" : "Recipe", d.recipe
      ? `${d.recipe.needs.map(([x, n]) => `${name(x)} ×${n}`).join(", ")} → ${d.recipe.in.map((tool) => name(tool)).join(" + ")} · ${th ? `ได้ ${d.recipe.serves} ที่` : `serves ${d.recipe.serves}`}${d.recipe.cooks > 1 ? (th ? ` · ต้อง ${d.recipe.cooks} คน` : ` · ${d.recipe.cooks} cooks`) : ""}`
      : (th ? "ไม่มี (ลุงขาย)" : "none (the uncle sells it)")]);
  }
  const inside = INSIDE[id];
  if (inside) facts.push([th ? "เปิดดูได้" : "Opens", inside.tiers
    ? (th ? `เจอม้วนสูตร ${Math.round(inside.chance * 100)}% · ของช่วงเกม ${inside.tiers.join(", ")}` : `a scroll ${Math.round(inside.chance * 100)}% of the time · of tier ${inside.tiers.join(", ")}`)
    : `${Math.round(inside.chance * 100)}% · ${(inside.things ?? []).map((x) => name(x)).join(", ")}`]);
  const of = SCROLLS[id];
  if (of) facts.push([th ? "สูตรของ" : "The recipe of", name(of)]);
  return (
    <div className="max-h-[46%] overflow-y-auto overscroll-contain border-t border-line bg-card/60 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <ItemIcon id={id} size={52} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-read font-semibold text-ink">{it.name.th}</p>
          <p className="truncate text-meta text-muted">{it.name.en} · <code className="font-data">{id}</code> · {it.kind}</p>
          <p className="text-meta text-muted">{th ? it.about.th : it.about.en}</p>
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-meta">
        {facts.map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="min-w-0 text-ink">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onConjure(1)} className="pressable min-h-11 rounded-full bg-gold px-4 text-ui font-semibold text-bg">{th ? "เสก 1" : "Conjure 1"}</button>
        {it.stack > 1 && (
          <button type="button" onClick={() => onConjure(it.stack)} className="pressable min-h-11 rounded-full border border-gold/70 px-4 text-ui font-semibold text-gold hover:bg-gold/10">
            {th ? `เสกเต็มกอง ×${it.stack}` : `A full stack ×${it.stack}`}
          </button>
        )}
        {onLearn && (
          <button type="button" disabled={knows} onClick={onLearn} className="pressable min-h-11 rounded-full border border-line-strong px-4 text-ui text-ink hover:border-gold disabled:opacity-40">
            {knows ? (th ? "รู้สูตรแล้ว" : "Recipe known") : (th ? "จดสูตรนี้" : "Learn the recipe")}
          </button>
        )}
        <span className="ml-auto font-data text-meta text-muted">{th ? `ในกระเป๋า ${have}` : `${have} in the bag`}</span>
      </div>
    </div>
  );
}

/** A line of the "Me" page: what it is, what it is now, and what can be done to it. */
function Row({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="border-b border-line py-2.5">
      <p className="flex items-center justify-between gap-2 text-ui"><span className="font-semibold text-ink">{label}</span>{value}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
function Do({ onClick, on = false, children }: { onClick: () => void; on?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on || undefined}
            className={`pressable min-h-9 rounded-full border px-3 text-meta ${on ? "border-gold bg-gold/15 font-semibold text-gold" : "border-line-strong text-ink hover:border-gold"}`}>
      {children}
    </button>
  );
}

const ENDS: Record<FishingPlay["how"], [string, string]> = {
  landed: ["ได้", "landed"], snapped: ["สายขาด", "snapped"], slipped: ["เบ็ดหลุด", "slipped"], early: ["ตวัดเร็วไป", "too soon"], missed: ["ตวัดไม่ทัน", "missed"], left: ["เก็บเบ็ดก่อน", "left"],
};
/** The record of every go at the mini-games: the tally, and the newest lines of the log. */
function Plays({ th, tally, log: all, onForget }: { th: boolean; tally: Tally; log: Play[]; onForget: () => void }) {
  const log = all.filter((p): p is FishingPlay => p.game === "fishing"), work = all.filter((p): p is WorkPlay => p.game !== "fishing");
  const g = tally.games.fishing, f = tally.fishing, name = (x: ItemId) => (th ? ITEMS[x].name.th : ITEMS[x].name.en);
  const caught = (Object.keys(f.caught) as Array<keyof typeof f.caught>).sort((a, b) => f.caught[b]!.hooked - f.caught[a]!.hooked);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
      <h3 className="mb-1 flex items-center gap-1.5 text-ui font-semibold text-ink"><TownIcon name="hook" size={16} />{th ? "ตกปลา" : "Fishing"}</h3>
      {g ? (
        <>
          <p className="text-meta text-muted">
            {th ? `หย่อนเบ็ด ${g.plays} ครั้ง · ได้ ${g.won} · สู้ปลารวม ${Math.round(g.secs)} วิ · เล่นตอน stamina หมด ${g.spent} ครั้ง · จากลาน ${f.places.deck} ริมตลิ่ง ${f.places.bank}`
              : `${g.plays} lines dropped · ${g.won} landed · ${Math.round(g.secs)} s of fights · ${g.spent} with no stamina · ${f.places.deck} from the deck, ${f.places.bank} from the bank`}
          </p>
          <p className="mt-1 text-meta text-muted">
            {(Object.keys(ENDS) as Array<FishingPlay["how"]>).filter((k) => f.ends[k]).map((k) => `${th ? ENDS[k][0] : ENDS[k][1]} ${f.ends[k]}`).join(" · ")}
            {" · "}{th ? "ตวัด" : "strikes"}: perfect {f.strikes.perfect ?? 0} / good {f.strikes.good ?? 0} / late {f.strikes.late ?? 0}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {caught.map((id) => (
              <li key={id} className="flex items-center gap-1 rounded-full bg-bg/40 px-2 py-0.5 text-meta text-ink">
                <ItemIcon id={id} size={16} />{name(id)}
                <span className="font-data tabular-nums text-muted">{f.caught[id]!.landed}/{f.caught[id]!.hooked}{f.caught[id]!.longest ? ` · ${f.caught[id]!.longest} cm` : ""}</span>
              </li>
            ))}
          </ul>
          <h4 className="mb-1 mt-3 font-data text-label uppercase tracking-wider text-muted">{th ? `ล่าสุด (เก็บไว้ ${log.length} บรรทัด)` : `Newest (${log.length} lines kept)`}</h4>
          <ol className="flex flex-col gap-1">
            {log.slice(-12).reverse().map((p) => (
              <li key={p.at} className="flex items-center gap-2 rounded-lg border border-line bg-card/60 px-2 py-1 text-meta">
                <ItemIcon id={p.what} size={18} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-ink">
                  <span className={p.won ? "font-semibold text-jade" : "text-chili"}>{th ? ENDS[p.how][0] : ENDS[p.how][1]}</span> {name(p.what)}{p.size ? ` ${p.size} cm` : ""}
                  <span className="text-muted"> · {name(p.bait)} · {p.place === "deck" ? (th ? "ลาน" : "deck") : (th ? "ตลิ่ง" : "bank")}{p.spent ? (th ? " · หมดแรง" : " · spent") : ""}</span>
                </span>
                <span className="shrink-0 font-data tabular-nums text-muted">
                  {p.strike ?? "–"}{p.reaction !== null ? ` ${p.reaction.toFixed(2)}s` : ""}{p.fight ? ` · ${p.secs}s · ${Math.round(p.fight.inBand * 100)}%` : ""}
                </span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={onForget} className="pressable mt-3 min-h-9 rounded-full border border-line-strong px-3 text-meta text-ink hover:border-chili">{th ? "ล้างประวัติ" : "Wipe the record"}</button>
        </>
      ) : <p className="text-meta text-muted">{th ? "ยังไม่มีประวัติ หย่อนเบ็ดสักครั้งแล้วจะขึ้นที่นี่" : "Nothing yet. Drop a line and it shows here."}</p>}
      {/* the other games: work done by the game of timing */}
      {(["farming", "cooking"] as const).map((game) => {
        const g2 = tally.games[game], mine = work.filter((p) => p.game === game);
        if (!g2) return null;
        return (
          <div key={game} className="mt-4">
            <h3 className="mb-1 text-ui font-semibold text-ink">{game === "farming" ? (th ? "งานแปลงผัก" : "Field work") : game === "cooking" ? (th ? "ทำอาหาร" : "Cooking") : (th ? "ล้างหม้อ" : "Washing up")}</h3>
            <p className="text-meta text-muted">{th ? `${g2.plays} ครั้ง · สำเร็จ ${g2.won} · รวม ${Math.round(g2.secs)} วิ · ตอน stamina หมด ${g2.spent}` : `${g2.plays} goes · ${g2.won} done · ${Math.round(g2.secs)} s · ${g2.spent} with no stamina`}</p>
            <ol className="mt-1 flex flex-col gap-1">
              {mine.slice(-6).reverse().map((p) => (
                <li key={p.at} className="flex items-center gap-2 rounded-lg border border-line bg-card/60 px-2 py-1 text-meta">
                  <span className="min-w-0 flex-1 truncate text-ink">{p.what}</span>
                  <span className="shrink-0 font-data tabular-nums text-muted">{p.hits}/{p.need} · {th ? "พลาด" : "missed"} {p.misses} · {p.secs}s</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
