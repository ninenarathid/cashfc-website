"use client";

import { useState } from "react";

/**
 * ClassJob ids, which are also the icon numbers: ui/icon/062000/062{id}_hr1.tex.
 * Keyed by the full job name FF Logs reports (bestSpec), with the three-letter
 * abbreviation alongside because that is what people read at a glance.
 */
const JOBS: Record<string, { id: number; abbr: string; role: Role }> = {
  Paladin:      { id: 19, abbr: "PLD", role: "tank" },
  Warrior:      { id: 21, abbr: "WAR", role: "tank" },
  DarkKnight:   { id: 32, abbr: "DRK", role: "tank" },
  Gunbreaker:   { id: 37, abbr: "GNB", role: "tank" },
  WhiteMage:    { id: 24, abbr: "WHM", role: "healer" },
  Scholar:      { id: 28, abbr: "SCH", role: "healer" },
  Astrologian:  { id: 33, abbr: "AST", role: "healer" },
  Sage:         { id: 40, abbr: "SGE", role: "healer" },
  Monk:         { id: 20, abbr: "MNK", role: "dps" },
  Dragoon:      { id: 22, abbr: "DRG", role: "dps" },
  Ninja:        { id: 30, abbr: "NIN", role: "dps" },
  Samurai:      { id: 34, abbr: "SAM", role: "dps" },
  Reaper:       { id: 39, abbr: "RPR", role: "dps" },
  Viper:        { id: 41, abbr: "VPR", role: "dps" },
  Bard:         { id: 23, abbr: "BRD", role: "dps" },
  Machinist:    { id: 31, abbr: "MCH", role: "dps" },
  Dancer:       { id: 38, abbr: "DNC", role: "dps" },
  BlackMage:    { id: 25, abbr: "BLM", role: "dps" },
  Summoner:     { id: 27, abbr: "SMN", role: "dps" },
  RedMage:      { id: 35, abbr: "RDM", role: "dps" },
  Pictomancer:  { id: 42, abbr: "PCT", role: "dps" },
  BlueMage:     { id: 36, abbr: "BLU", role: "dps" },
};

type Role = "tank" | "healer" | "dps";

const ROLE_COLOR: Record<Role, string> = {
  tank: "#7ea6c9", healer: "#6aa84f", dps: "#d14b3a",
};

/** FF Logs writes "Dark Knight", "Black Mage"; the lookup key has no spaces. */
const key = (name: string) => name.replace(/[^A-Za-z]/g, "");

export function jobInfo(name?: string | null) {
  if (!name) return null;
  return JOBS[key(name)] ?? null;
}

export function jobAbbr(name?: string | null): string | null {
  return jobInfo(name)?.abbr ?? name ?? null;
}

export function jobColor(name?: string | null): string {
  const info = jobInfo(name);
  return info ? ROLE_COLOR[info.role] : "#9c8f78";
}

/**
 * Job icon straight from the game's own art, served by XIVAPI. Falls back to a
 * role-coloured square with the abbreviation, so an unknown or newly added job — or
 * XIVAPI having a bad day — still renders something readable rather than a gap.
 */
export default function JobIcon(
  { job, size = 18, className = "" }:
  { job?: string | null; size?: number; className?: string },
) {
  const [broken, setBroken] = useState(false);
  const info = jobInfo(job);
  if (!job) return null;

  if (!info || broken) {
    return (
      <span
        title={job}
        style={{ width: size, height: size, borderColor: jobColor(job),
                 color: jobColor(job), fontSize: Math.max(7, size * 0.42) }}
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border font-data font-bold leading-none ${className}`}
      >
        {(info?.abbr ?? job).slice(0, 3).toUpperCase()}
      </span>
    );
  }

  const n = String(info.id).padStart(3, "0");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://v2.xivapi.com/api/asset?format=webp&path=ui/icon/062000/062${n}_hr1.tex`}
      alt={job}
      title={job}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
