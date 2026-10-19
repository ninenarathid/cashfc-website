"use client";

import { useRef } from "react";
import { useCloses } from "./useCloses";
import { COMPANIONS } from "@/lib/town/quality";
import { FAVOURITES, HOUSE, favouriteNear, houseRoleOf, isRareInHouse, keepOf, plantsInReach, type InsectHouse } from "@/lib/town/insect-house";
import type { Plot } from "@/lib/town/farm";
import { ITEMS, type ItemId } from "@/lib/town/items";
import TownIcon, { type IconName } from "./TownIcon";

/*
 * The insect house on the page (the design's mock "บ้านแมลง · สองห้อง ครึ่งแถบ", approved 2026-10-15): a chip when one
 * stands at the house, and the card it opens: how many plants it reaches, each room's insect with what it fills and
 * how long it stays, and its favourite plant. Rules: lib/town/insect-house.
 */

const ROLE_WORD = { soil: ["เติมดิน", "Fills soil"], water: ["เติมน้ำ", "Fills water"], pollen: ["เติมเกสร", "Fills pollen"], guard: ["เติมป้องกัน", "Fills guard"] } as const;
const ROLE_TINT = { soil: "#b07a3e", water: "#4a9be0", pollen: "#e3b23c", guard: "#d65a48" } as const;
// (how often the hunters keep a pest off, the least and the most, lib/town/insect-house's HOUSE.keeps)
const KEEPS = [HOUSE.keep, ...Object.values(HOUSE.keeps)].map((k) => Math.round((k ?? 0) * 100)), KEEP_SPAN = `${Math.min(...KEEPS)}–${Math.max(...KEEPS)}%`;
const hoursLeft = (to: number, now: number) => Math.max(1, Math.ceil((to - now) / 3_600_000));

/** Standing at the house: how many plants it reaches and how many rooms are lived in, and the way into its card. */
export function HouseChip({ at, house, plots, now, th, onOpen }: { at: string; house: InsectHouse; plots: Readonly<Record<string, Plot>>; now: number; th: boolean; onOpen: () => void }) {
  const lived = house.rooms.filter((r) => r && r.until > now).length;
  return (
    <button type="button" onClick={onOpen} data-house-chip
            className="pop-in pressable tk tk-slot pointer-events-auto flex min-h-11 items-center gap-2 px-3 text-ui text-ink" data-state="open">
      <TownIcon name={"insectHouse" as IconName} size={22} />
      <span className="font-semibold">{th ? "บ้านแมลง" : "Insect house"} <span className="font-data tabular-nums">{lived}/{HOUSE.rooms}</span></span>
      <span className="text-meta text-muted">{th ? `ช่วย ${plantsInReach(at, plots).length} ต้น` : `helps ${plantsInReach(at, plots).length}`}</span>
    </button>
  );
}

/** The house's card: its reach, and each room. */
export function HousePanel({ at, house, plots, now, th, mine, onClose }: { at: string; house: InsectHouse; plots: Readonly<Record<string, Plot>>; now: number; th: boolean; mine: boolean; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useCloses(onClose, close);
  const name = (id: ItemId) => ITEMS[id]?.name[th ? "th" : "en"] ?? id;
  const helped = plantsInReach(at, plots).length;
  return (
    <section data-house-panel style={{ maxHeight: "min(40rem, calc(100dvh - 10rem))" }}
             className="tk tk-plate pointer-events-auto flex w-[min(440px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto overscroll-contain p-3 pb-12 text-ui text-ink sm:gap-2.5 sm:p-4"
             aria-label={th ? "บ้านแมลง" : "Insect house"}>
      <header className="flex items-center gap-2">
        <TownIcon name={"insectHouse" as IconName} size={30} />
        <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{th ? "บ้านแมลง" : "Insect house"}</h2>
        <span className="text-meta text-muted" data-house-helps>{th ? `ช่วย ${helped} ต้น · 5×5` : `Helps ${helped} · 5×5`}</span>
        <button ref={close} type="button" onClick={onClose} aria-label={th ? "ปิด" : "Close"} className="pressable tk tk-btn-wood grid size-11 shrink-0 place-items-center"><TownIcon name="close" size={16} /></button>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        {house.rooms.map((room, i) => {
          const live = !!room && room.until > now, role = room ? houseRoleOf(room.bug) : null;
          const fav = room ? FAVOURITES[room.bug] : undefined, favName = fav ? COMPANIONS[fav][th ? "th" : "en"] : null;
          const base = room ? (isRareInHouse(room.bug) ? HOUSE.rareHours : HOUSE.hours) * 3_600_000 : 0, kept = !!room && room.until - room.from > base;
          return (
            <div key={i} data-house-room={i} data-house-room-live={live ? "" : undefined}
                 className="flex min-w-0 flex-col gap-1 rounded border-[1.5px] border-[#1a0e06] bg-[#4a3522] px-2.5 py-2"
                 style={live && role ? { boxShadow: `inset 4px 0 0 ${ROLE_TINT[role]}` } : undefined}>
              <b className="flex items-center gap-1.5 text-meta">
                {th ? `ห้อง ${i + 1}` : `Room ${i + 1}`}{live && room ? <> · <TownIcon name={room.bug as IconName} size={18} />{name(room.bug)}</> : null}
              </b>
              {live && room && role ? <>
                {/* (a hunter keeps pests off the plants it reaches so often as well, lib/town/farm's houseKeepAt: the owner, 2026-10-19) */}
                <span className="text-label text-[#ead9b4]">{role === "guard" ? `${th ? "กันศัตรูพืช" : "Keeps pests off"} ${Math.round(keepOf(room.bug) * 100)}% · ` : ""}{ROLE_WORD[role][th ? 0 : 1]}{isRareInHouse(room.bug) ? (th ? " · หายาก ยกต่ำสุด" : " · rare: raises the floor") : ""} · {th ? `เหลือ ${hoursLeft(room.until, now)} ชม.` : `${hoursLeft(room.until, now)} h left`}</span>
                {favName && <span className="text-label text-[#ead9b4]">{kept ? (th ? `${favName}อยู่ใกล้ ✓ +${HOUSE.favHours} ชม.` : `${favName} near ✓ +${HOUSE.favHours} h`) : th ? `ชอบ${favName} · ตอนใส่ยังไม่มี` : `Likes ${favName} · none when it went in`}</span>}
              </> : <span className="text-label text-[#ead9b4]">{room ? (th ? `ว่าง · ${name(room.bug)}ออกไปแล้ว` : `Empty · the ${name(room.bug).toLowerCase()} has gone`) : th ? "ว่าง" : "Empty"}</span>}
            </div>
          );
        })}
      </div>
      <p className="tk tk-window px-3 py-2 text-meta text-[#3b2412]" data-house-tip>
        {/* (a sentence a line, Codex's look of 2026-10-19: one run of words read dense on a phone) */}
        {mine
          ? (th ? [`ถือแมลงผสมเกสร (เกสร) หรือแมลงล่าเหยื่อ (กันศัตรูพืช ${KEEP_SPAN}) แล้วกดที่บ้าน ต้นใน 5×5 ได้ครึ่งแถบ`, "ศัตรูพืชที่เกาะก่อนแล้ว ยังต้องใช้ยา", "มีพืชที่มันชอบอยู่ใกล้ตอนใส่ อยู่ต่อ +24 ชม."]
            : [`Use a pollinator (pollen) or a predator (keeps ${KEEP_SPAN} of pests off) on the house: plants within 5×5 get half a bar`, "A pest already there still needs a cure", "With its favourite plant near as it goes in, it stays 24 h more"]).map((line) => <span key={line} className="block">▸ {line}</span>)
          : <>▸ {th ? "บ้านแมลงของคนอื่น" : "Somebody else's insect house"}</>}
        {mine && house.rooms.some((r) => !r || r.until <= now) && (() => {
          const near = Object.entries(FAVOURITES).filter(([bug]) => favouriteNear(at, bug as ItemId, plots)).map(([bug]) => name(bug as ItemId));
          return near.length ? <span className="block" data-house-favourites>{th ? `ตอนนี้ได้ +24 ชม.: ${near.slice(0, 4).join(", ")}` : `+24 h now: ${near.slice(0, 4).join(", ")}`}</span> : null;
        })()}
      </p>
    </section>
  );
}
