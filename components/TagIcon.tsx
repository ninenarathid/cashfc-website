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
 * They are drawn as circles, with one exception marked `square` below. FFXIV bakes an opaque plate into every category and
 * item icon — the only transparent art in the game is the 42 class symbols, which
 * have nothing to say about treasure maps or seasonal events — so a square tile
 * inside a rounded chip always read as a sticker stuck on top of it. Cropping to a
 * circle loses the corners of the plate and nothing else.
 */
const TAG_ICON: Record<string, { path: string; alt: string; square?: boolean }> = {
  // Playstyles, from rare achievements.
  // The game's own Disciple of the Hand icon — hammer and anvil. 035106 was a
  // blacksmith's hammer, which is one crafter of eight.
  crafter:    { path: "061000/061816", alt: "crafting", square: true },
  // Disciple of the Land — fish and wheat, which covers all three gatherers
  // where 038011, a pickaxe, only ever meant the miner.
  gatherer:   { path: "061000/061815", alt: "gathering", square: true },
  // A relic lance, square because a weapon icon is mostly a long diagonal and a
  // circle takes both ends off it.
  relic:      { path: "031000/031917", alt: "relic weapon", square: true },
  // Exploration — the airship and the glass, which is what Eureka, Bozja and
  // the Occult Crescent are. 001001 was a map, and a map is where you look
  // things up rather than where you go.
  explorer:   { path: "061000/061821", alt: "exploration", square: true },
  // The game's own Treasure Hunt icon — the chest the Duty Finder puts on every
  // map dungeon. 000116 was the map item itself, which is what you hold rather
  // than what you are doing. Square, like the other duty badges.
  treasure:   { path: "061000/061808", alt: "treasure hunt", square: true },
  // The Gold Saucer's own icon. 027661 was a Triple Triad card, which is one
  // game in an arcade full of them.
  goldsaucer: { path: "061000/061820", alt: "Gold Saucer", square: true },
  // The game's own Seasonal Event icon — the pinwheel the Duty Finder and the
  // Lodestone put on every Starlight, Moonfire and Heavensturn. 026107 was a
  // wrapped present, which is one event's prop rather than the whole calendar.
  // Square, like the other duty badges.
  seasonal:   { path: "061000/061826", alt: "seasonal event", square: true },
  // The game's own PvP icon — crossed swords on red, the badge the Duty Finder
  // puts on Frontline and Crystalline Conflict. 000210 was a raised fist, which
  // is a generic action icon and said "fighting" rather than "PvP". Square, like
  // the other duty badges.
  pvp:        { path: "061000/061806", alt: "PvP", square: true },
  oldtimer:   { path: "062000/062916", alt: "quill" },

  // Raiding, from FF Logs. Tier cleared and Progging share an icon deliberately —
  // they are the same tier, one finished and one not, and the chip already says
  // which by its label and its dashed border. No member can hold both.
  //
  // The game's own Savage icon — the orange maw the Duty Finder puts on every
  // savage raid. 064848 was a generic raid symbol. Square for the same reason
  // the extreme one is: it is a duty badge with its own frame, not an item.
  "tier-clear": { path: "061000/061802", alt: "savage raid", square: true },
  prog:         { path: "061000/061802", alt: "savage raid", square: true },
  // The game's own Extreme icon — the red mask the Duty Finder puts on every
  // extreme trial. 062969 was the generic trials icon, which said "a trial"
  // where this says "the hard one".
  //
  // Square, unlike everything else here. The rule below exists because item and
  // category icons carry an opaque plate that reads as a sticker inside a
  // rounded chip; this one is not an item icon but a duty badge, drawn with its
  // own frame and its horns going into the corners. Cropping it to a circle
  // took the frame off and cut the horns, which is the one case where the
  // circle loses something.
  extreme:      { path: "061000/061804", alt: "extreme trial", square: true },
  // The game's own Ultimate icon — the violet mask. 000317 was the achievement
  // art the game puts on an Ultimate clear, which is close but is a reward
  // rather than the duty. Square, like the other two duty badges.
  ultimate:     { path: "061000/061832", alt: "ultimate raid", square: true },
  veteran:      { path: "002000/002669", alt: "past raids" },

  // Casual, Achievements private and No data get nothing on purpose: an icon
  // would dress up the absence of information as a thing somebody achieved.
};

export const hasTagIcon = (tag: string) => tag in TAG_ICON;

/**
 * Any of the game's icons, by path.
 *
 * Split out of TagIcon so somewhere that is not a tag — a section heading, a
 * tab — can use the same art without inventing a tag to hang it on, and without
 * a second copy of the URL, the fallback and the circle rule.
 */
export function GameIcon(
  { path, alt = "", size = 14, square = false, className = "" }:
  { path: string; alt?: string; size?: number; square?: boolean; className?: string },
) {
  const [broken, setBroken] = useState(false);
  // No placeholder: unlike a job, these always carry their name right beside
  // them, so a missing icon should leave the chip looking as it did before.
  if (broken) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://v2.xivapi.com/api/asset?format=webp&path=ui/icon/${path}_hr1.tex`}
      alt=""
      title={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block shrink-0 object-contain ${
        square ? "rounded-[2px]" : "rounded-full object-cover ring-1 ring-black/25"
      } ${className}`}
    />
  );
}

export default function TagIcon(
  { tag, size = 14, className = "" }:
  { tag: string; size?: number; className?: string },
) {
  const icon = TAG_ICON[tag];
  if (!icon) return null;
  return <GameIcon path={icon.path} alt={icon.alt} size={size}
                   square={icon.square} className={className} />;
}
