"use client";

import { useState } from "react";

/**
 * The game's own art for each playstyle, served by XIVAPI the same way JobIcon
 * serves job symbols — no third-party or invented iconography anywhere on the board.
 *
 * Every path below was picked by looking at the rendered image, not by guessing from
 * a filename: each one is an object rather than character art, because a portrait
 * turns to mush at 14px while a pickaxe still reads as a pickaxe. Where a playstyle
 * had no obvious single object, the icon is the one the game itself uses most often
 * on achievements in that category.
 */
const TAG_ICON: Record<string, { path: string; alt: string }> = {
  crafter:    { path: "035000/035106", alt: "blacksmith's hammer" },
  gatherer:   { path: "038000/038011", alt: "pickaxe" },
  relic:      { path: "036000/036572", alt: "relic weapon" },
  explorer:   { path: "001000/001001", alt: "map" },
  treasure:   { path: "000000/000116", alt: "treasure map" },
  goldsaucer: { path: "027000/027661", alt: "Triple Triad card" },
  seasonal:   { path: "026000/026107", alt: "wrapped gift" },
  pvp:        { path: "000000/000210", alt: "raised fist" },
  oldtimer:   { path: "062000/062916", alt: "quill" },
};

export const hasTagIcon = (tag: string) => tag in TAG_ICON;

export default function TagIcon(
  { tag, size = 14, className = "" }:
  { tag: string; size?: number; className?: string },
) {
  const [broken, setBroken] = useState(false);
  const icon = TAG_ICON[tag];
  // No placeholder square: unlike a job, a tag always carries its name right beside
  // it, so a missing icon should simply leave the chip as it was.
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
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
