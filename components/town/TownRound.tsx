"use client";

import { useState } from "react";
import { BANDS, type BandId } from "@/lib/town/bands";
import { ITEMS, type ItemId } from "@/lib/town/items";
import { HABIT_KINDS, type Habit, type HabitKind, type Place, type Strip } from "@/lib/town/specials";
import TownIcon, { type IconName } from "./TownIcon";
import { ItemIcon } from "./TownTrade";

/*
 * A round's strip (lib/town/specials, the idea patch's "ความน่าค้นหา"): six small wells, one a kind of habit, in the
 * order the book shows them, each lit with what the round had of it (the bands it was out in, where it went, what was
 * put in its trough, rain or wind, company, a full heart) or its kind's icon dimmed when it had none; the special it
 * brought glowing at the end. Pictures and few words: a tap on a well says it in a line. The owner's taste of 2026-11-07,
 * "pictures, not paragraphs".
 */

/** lib/town/animals' band indexes (0 = 03-05 … 7 = 23-03) to the clock's bands. */
const BAND_IDS: readonly BandId[] = ["beforeDawn", "earlyMorning", "lateMorning", "midday", "afternoon", "evening", "night", "lateNight"];
export const bandOfIndex = (i: number) => BANDS.find((b) => b.id === BAND_IDS[i])!;
const hours = (i: number) => { const b = bandOfIndex(i), p = (h: number) => String(h % 24).padStart(2, "0"); return `${p(b.from)}–${p(b.to)}`; };
export const KIND_ICON: Record<HabitKind, IconName> = { time: "habitTime", place: "habitPlace", food: "habitFood", weather: "habitWeather", company: "habitCompany", heart: "habitHeart" } as Record<HabitKind, IconName>;
export const KIND_WORD: Record<HabitKind, [string, string]> = { time: ["เวลาออกเที่ยว", "Time out"], place: ["ที่ชอบ", "Favourite place"], food: ["ของกินที่ชอบ", "Favourite food"], weather: ["อากาศ", "Weather"], company: ["เพื่อน", "Company"], heart: ["ใจเต็ม", "Full heart"] };
export const PLACE_ICON: Record<Place, IconName> = { garden: "plotSprout", meadow: "sweetTimothy", pond: "lotusBloom", barn: "sheepFeed" } as Record<Place, IconName>;
export const PLACE_WORD: Record<Place, [string, string]> = { garden: ["แปลงผัก", "the garden"], meadow: ["ทุ่งหญ้า", "the meadow"], pond: ["บ่อ", "the pond"], barn: ["อยู่ในโรงทั้งรอบ", "in the barn all round"] };
const SKY_ICON = { rain: "waterRain", wind: "fxLeaves" } as Record<"rain" | "wind", IconName>;
const SKY_WORD = { rain: ["ฝน", "rain"], wind: ["ลมแรง", "strong wind"] } as const;

/** A habit in a picture and a few words: what the book tells whoever has found its special three times. */
export function HabitTold({ habit, th }: { habit: Habit; th: boolean }) {
  const t = (a: string, b: string) => (th ? a : b);
  const [icon, words]: [IconName | ItemId, string] = habit.kind === "time" ? [bandOfIndex(habit.band).icon as IconName, t(`ออกนอกโรงช่วง ${hours(habit.band)}`, `out ${hours(habit.band)}`)]
    : habit.kind === "place" ? [PLACE_ICON[habit.place], habit.place === "barn" ? t("อยู่ในโรงทั้งรอบ", "in the barn all round") : t(`ไป${PLACE_WORD[habit.place][0]}`, `goes to ${PLACE_WORD[habit.place][1]}`)]
    : habit.kind === "food" ? [habit.item as ItemId, t(`กิน${ITEMS[habit.item as ItemId]?.name.th ?? habit.item}`, `eats ${ITEMS[habit.item as ItemId]?.name.en ?? habit.item}`)]
    : habit.kind === "weather" ? [SKY_ICON[habit.sky], t(`เจอ${SKY_WORD[habit.sky][0]}`, `meets ${SKY_WORD[habit.sky][1]}`)]
    : habit.kind === "company" ? [KIND_ICON.company, t("มีเพื่อนสัตว์หรือเพื่อนช่วยดูแล", "a friend's animal out, or a friend's care")]
    : [KIND_ICON.heart, t("10 หัวใจ ได้ลูบและขนมวันนั้น", "10 hearts, a pet and a treat that day")];
  return (
    <span className="inline-flex items-center gap-1.5" data-habit-told={habit.kind}>
      {habit.kind === "food" ? <ItemIcon id={icon as ItemId} size={20} /> : <TownIcon name={icon as IconName} size={20} />}
      <span className="text-label text-gold">{words}</span>
    </span>
  );
}

/** One well of the strip: its kind's icon dimmed when the round had none of it, else what it had (two pictures, then "+n"). */
function Well({ kind, items, on, th, said, onSay }: { kind: HabitKind; items: Array<{ icon: IconName | ItemId; item?: boolean }>; on: boolean; th: boolean; said: string; onSay: (s: string) => void }) {
  const shown = items.slice(0, 2), more = items.length - shown.length;
  return (
    <button type="button" onClick={() => onSay(said)} aria-label={said} title={said} data-well={kind} data-on={on || undefined}
            className={`tk tk-slot pressable flex h-11 min-w-11 items-center justify-center gap-0.5 px-1 ${on ? "" : "opacity-75"}`}>
      {on && shown.length ? shown.map((x, i) => (x.item ? <ItemIcon key={i} id={x.icon as ItemId} size={20} /> : <TownIcon key={i} name={x.icon as IconName} size={20} />))
        : <TownIcon name={KIND_ICON[kind]} size={20} className={on ? "" : "opacity-70 grayscale"} />}
      {on && more > 0 && <span className="font-data text-[0.65rem] leading-none text-muted">+{more}</span>}
      <span className="sr-only">{th ? KIND_WORD[kind][0] : KIND_WORD[kind][1]}</span>
    </button>
  );
}

/** A round's strip: the six wells and the special it brought (`special` false: told elsewhere). `at`: the collection's time, over it. */
export function RoundStrip({ strip, th, at, special = true }: { strip: Strip; th: boolean; at?: string; special?: boolean }) {
  const t = (a: string, b: string) => (th ? a : b);
  const [said, setSaid] = useState("");
  const bands = Array.from({ length: 8 }, (_, i) => i).filter((i) => strip.bands & (1 << i));
  const out = bands.length > 0;
  const wells: Record<HabitKind, { items: Array<{ icon: IconName | ItemId; item?: boolean }>; on: boolean; said: string }> = {
    time: { items: bands.map((i) => ({ icon: bandOfIndex(i).icon as IconName })), on: out, said: out ? t(`ออกนอกโรง ${bands.map(hours).join(", ")}`, `Out ${bands.map(hours).join(", ")}`) : t("ไม่ได้ออกนอกโรง", "Never out") },
    place: { items: strip.places.map((p) => ({ icon: PLACE_ICON[p] })), on: strip.places.length > 0, said: strip.places.length ? strip.places.map((p) => PLACE_WORD[p][th ? 0 : 1]).join(", ") : t("ไม่รู้", "Unknown") },
    food: { items: strip.ate.map((id) => ({ icon: id as ItemId, item: true })), on: strip.ate.length > 0, said: strip.ate.length ? t(`กิน ${strip.ate.map((id) => ITEMS[id as ItemId]?.name.th ?? id).join(", ")}`, `Ate ${strip.ate.map((id) => ITEMS[id as ItemId]?.name.en ?? id).join(", ")}`) : t("ไม่ได้เติมอาหารรอบนี้", "Nothing put in its trough this round") },
    weather: { items: [...(strip.rain ? [{ icon: SKY_ICON.rain }] : []), ...(strip.wind ? [{ icon: SKY_ICON.wind }] : [])], on: strip.rain || strip.wind, said: strip.rain || strip.wind ? [strip.rain ? SKY_WORD.rain[th ? 0 : 1] : "", strip.wind ? SKY_WORD.wind[th ? 0 : 1] : ""].filter(Boolean).join(t(" และ", " and ")) : t("ฟ้าโปร่ง ลมสงบ", "Clear and calm") },
    company: { items: [{ icon: KIND_ICON.company }], on: strip.company, said: strip.company ? t("มีเพื่อน", "Had company") : t("ไม่มีเพื่อน", "No company") },
    heart: { items: [{ icon: KIND_ICON.heart }], on: strip.heart, said: strip.heart ? t("ใจเต็มวันหนึ่ง", "A full heart one day") : t("ใจยังไม่เต็ม", "No full heart") },
  };
  return (
    <div data-round-strip data-special={strip.special ?? ""}>
      {(at || (special && strip.special)) && (
        <div className="mb-1 flex min-h-6 items-center gap-2">
          {at && <span className="font-data text-label tabular-nums text-muted">{at}</span>}
          {special && strip.special && (
            <button type="button" onClick={() => setSaid(t(`ได้ของพิเศษ ${ITEMS[strip.special as ItemId]?.name.th} ×${strip.n}`, `A special: ${ITEMS[strip.special as ItemId]?.name.en} ×${strip.n}`))}
                    className="pressable relative flex h-11 items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2.5 ring-2 ring-gold/80" data-strip-special={strip.special}
                    aria-label={t(`ได้ของพิเศษ ${ITEMS[strip.special as ItemId]?.name.th} ×${strip.n}`, `A special ×${strip.n}`)}>
              <span aria-hidden className="absolute inset-0 rounded-full bg-gold/20 motion-safe:animate-pulse" />
              <span className="relative"><ItemIcon id={strip.special as ItemId} size={28} /></span>
              <span className="relative font-data text-meta font-semibold text-gold">×{strip.n}</span>
            </button>
          )}
        </div>
      )}
      {/* (six wells always in one row of six, as wide as there is room for, each a finger's size or more) */}
      <div className="grid max-w-[22rem] grid-cols-6 gap-1">
        {HABIT_KINDS.map((k) => <Well key={k} kind={k} th={th} onSay={setSaid} {...wells[k]} />)}
      </div>
      {said && <p className="mt-1 text-label text-ink" aria-live="polite" data-strip-said>{said}</p>}
    </div>
  );
}
