"use client";

import { useState } from "react";
import { TAG_ICON, gameIconUrl } from "@/lib/tag-icons";


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
      src={gameIconUrl(path)}
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
