"use client";

import { useEffect, useRef } from "react";
import { giftOf } from "@/lib/town/gifts";
import { hasSteed, rides } from "@/lib/town/riding";
import TownFoot from "./TownFoot";
import type { IconName } from "./TownIcon";

/**
 * Getting onto a steed's back, and down off it (the owner, 2026-10-22: "ภูมิ ที่ขี่ได้ กวาง / แกะ ใน cash town มีปุ่ม hot
 * key ในการขึ้นลง สัตว์ได้ด้วย โดยเมือใส่จะยังไม่ขี่ แต่มีปุ่ม hotkey ขึ้นมาให้กดขี่ได้"). A moss stag or a cloud ram put on
 * is walked beside (lib/town/session's setPet); this, first among the gifts' powers, gets on and off, and R does it on
 * a keyboard (by the key's place, so the same key with a Thai layout). Sat down, getting on gets up first. Not while
 * sat behind somebody or on the wagon, nor while something is typed or a game's board is up.
 */
export default function TownRide({ pet, afoot, sitting, seat, th, phone, onRide }: {
  /** The familiar the room was told follows me. */
  pet: string | null;
  /** Whether I walk beside it (lib/town/room's `afoot`). */
  afoot: boolean;
  sitting: boolean;
  /** Where I sit that is no seat of my own (behind a rider, on the wagon): "" when nowhere. */
  seat: string;
  th: boolean;
  phone: boolean;
  /** Get on (false) or down (true). */
  onRide: (afoot: boolean) => void;
}) {
  const riding = rides(pet, sitting, afoot), shown = hasSteed(pet) && !seat;
  const now = useRef({ shown, riding, onRide });
  now.current = { shown, riding, onRide };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyR" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !now.current.shown) return;
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (document.querySelector('[data-foot="board"]')) return;
      e.preventDefault();
      now.current.onRide(now.current.riding);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!shown) return null;
  const name = giftOf(pet!)?.name ?? { th: "สัตว์", en: "A steed" }, en = name.en.replace(/^An? /, "the ");
  const label = riding ? (th ? `ลงจาก${name.th}` : `Get off ${en}`) : th ? `ขี่${name.th}` : `Ride ${en}`;
  return (
    <TownFoot rank="power" order={10} icon={pet as IconName} hint={phone ? undefined : "R"}>
      <button type="button" aria-pressed={riding} onClick={() => onRide(riding)} aria-label={phone ? label : `${label} (R)`} data-town-ride={riding ? "on" : "off"} />
    </TownFoot>
  );
}
