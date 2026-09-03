"use client";

import { useState } from "react";

/**
 * The game's own art for each tag, served by XIVAPI the same way JobIcon serves job
 * symbols — no third-party or invented iconography anywhere on the board.
 *
 * Every path below was picked by rendering the image and looking at it, not by
 * guessing from a filename, and each is an object rather than character art: the
 * icon the game uses most often on gathering achievements is a portrait holding a
 * pickaxe, which is mush at 13px, while the pickaxe item icon still reads as one.
 *
 * They are drawn as circles. FFXIV bakes an opaque plate into every category and
 * item icon — the only transparent art in the game is the 42 class symbols, which
 * have nothing to say about treasure maps or seasonal events — so a square tile
 * inside a rounded chip always read as a sticker stuck on top of it. Cropping to a
 * circle loses the corners of the plate and nothing else.
 */
const TAG_ICON: Record<string, { path: string; alt: string }> = {
  // Playstyles, from rare achievements.
  crafter:    { path: "035000/035106", alt: "blacksmith's hammer" },
  gatherer:   { path: "038000/038011", alt: "pickaxe" },
  relic:      { path: "036000/036572", alt: "relic weapon" },
  explorer:   { path: "001000/001001", alt: "map" },
  treasure:   { path: "000000/000116", alt: "treasure map" },
  goldsaucer: { path: "027000/027661", alt: "Triple Triad card" },
  seasonal:   { path: "026000/026107", alt: "wrapped gift" },
  pvp:        { path: "000000/000210", alt: "raised fist" },
  oldtimer:   { path: "062000/062916", alt: "quill" },

  // Raiding, from FF Logs. Tier cleared and Progging share an icon deliberately —
  // they are the same tier, one finished and one not, and the chip already says
  // which by its label and its dashed border. No member can hold both.
  "tier-clear": { path: "064000/064848", alt: "savage raid" },
  prog:         { path: "064000/064848", alt: "savage raid" },
  extreme:      { path: "062000/062969", alt: "trials" },
  // The icon the game itself puts on every Ultimate clear achievement, from
  // Unending Coil through Dancing Mad — it draws no distinction between them either.
  ultimate:     { path: "000000/000317", alt: "ultimate raid" },
  veteran:      { path: "002000/002669", alt: "past raids" },

  // Casual, Achievements private and No data get nothing on purpose: an icon
  // would dress up the absence of information as a thing somebody achieved.
};

export const hasTagIcon = (tag: string) => tag in TAG_ICON;

export default function TagIcon(
  { tag, size = 14, className = "" }:
  { tag: string; size?: number; className?: string },
) {
  const [broken, setBroken] = useState(false);
  const icon = TAG_ICON[tag];
  // No placeholder: unlike a job, a tag always carries its name right beside it, so
  // a missing icon should simply leave the chip looking the way it did before.
  if (!icon || broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://v2.xivapi.com/api/asset?format=webp&path=ui/icon/${icon.path}_hr1.tex`}
      alt=""
      title={icon.alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block shrink-0 rounded-full object-cover ring-1 ring-black/25 ${className}`}
    />
  );
}
