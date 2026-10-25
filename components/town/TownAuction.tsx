"use client";

import { ShopWindowSoon, type ShopWindowProps } from "./TownTailor";

/**
 * The clothes shop's weekly auction (the owner, 2026-10-25): opened by a tap on the notice board on the shop's north
 * wall, or from a talk with Granny Twilla, "ประมูลประจำสัปดาห์". A stand-in until the auction's window is built: it says
 * so.
 */
export default function TownAuction({ th, art, onClose }: ShopWindowProps) {
  return <ShopWindowSoon id="town-auction-h" title={th ? "ประมูลชุดประจำสัปดาห์" : "This week's auction"} art={art}
    text={th ? "ยายยังไม่ได้ติดรายการประมูลสัปดาห์นี้เลยจ้ะ แวะมาดูใหม่นะ" : "Granny hasn't pinned up this week's auction yet. Do come back and look."}
    th={th} onClose={onClose} />;
}
