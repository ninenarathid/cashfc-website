"use client";

import { useState } from "react";

/**
 * ClassJob ids, which are also the icon numbers: ui/icon/062000/062{id}_hr1.tex.
 * Keyed by the full job name FF Logs reports (bestSpec), with the three-letter
 * abbreviation alongside because that is what people read at a glance.
 */
const JOBS: Record<string, { id: number; abbr: string; role: Role; color: string }> = {
  Paladin:      { id: 19, abbr: "PLD", role: "tank",   color: "#a8d2e6" },
  Warrior:      { id: 21, abbr: "WAR", role: "tank",   color: "#cf2621" },
  DarkKnight:   { id: 32, abbr: "DRK", role: "tank",   color: "#d126cc" },
  Gunbreaker:   { id: 37, abbr: "GNB", role: "tank",   color: "#796d30" },
  WhiteMage:    { id: 24, abbr: "WHM", role: "healer", color: "#fff0dc" },
  Scholar:      { id: 28, abbr: "SCH", role: "healer", color: "#8657ff" },
  Astrologian:  { id: 33, abbr: "AST", role: "healer", color: "#ffe74a" },
  Sage:         { id: 40, abbr: "SGE", role: "healer", color: "#80a0f0" },
  Monk:         { id: 20, abbr: "MNK", role: "dps",    color: "#d69c00" },
  Dragoon:      { id: 22, abbr: "DRG", role: "dps",    color: "#4164cd" },
  Ninja:        { id: 30, abbr: "NIN", role: "dps",    color: "#af1964" },
  Samurai:      { id: 34, abbr: "SAM", role: "dps",    color: "#e46d04" },
  Reaper:       { id: 39, abbr: "RPR", role: "dps",    color: "#965a90" },
  Viper:        { id: 41, abbr: "VPR", role: "dps",    color: "#108860" },
  Bard:         { id: 23, abbr: "BRD", role: "dps",    color: "#91ba5e" },
  Machinist:    { id: 31, abbr: "MCH", role: "dps",    color: "#6ee1d6" },
  Dancer:       { id: 38, abbr: "DNC", role: "dps",    color: "#e2b0af" },
  BlackMage:    { id: 25, abbr: "BLM", role: "dps",    color: "#a579d6" },
  Summoner:     { id: 27, abbr: "SMN", role: "dps",    color: "#2d9b78" },
  RedMage:      { id: 35, abbr: "RDM", role: "dps",    color: "#e87b7b" },
  Pictomancer:  { id: 42, abbr: "PCT", role: "dps",    color: "#fc92e1" },
  BlueMage:     { id: 36, abbr: "BLU", role: "dps",    color: "#4f8bc9" },
};

type Role = "tank" | "healer" | "dps";

const ROLE_COLOR: Record<Role, string> = {
  tank: "#7ea6c9", healer: "#6aa84f", dps: "#d14b3a",
};

/**
 * How strongly a job's own colour is applied, by proficiency tier: a Legendary
 * Reaper should read as unmistakably Reaper, an Expert one as a quieter version of
 * the same thing. Depth of colour carries the tier — no glow, because a page full
 * of them would be tiring to read.
 *
 * Text goes through color-mix so the darker job colours — Gunbreaker, Ninja,
 * Dragoon — stay readable on this background instead of disappearing into it.
 */
export function jobTierStyle(job: string, tier?: string | null): React.CSSProperties {
  const c = jobColor(job);
  const strength = tier === "legendary" ? 1 : tier === "master" ? 0.62 : 0.34;
  const pct = (a: number) => Math.round(a * 100);
  return {
    borderColor: `color-mix(in srgb, ${c} ${pct(0.3 + 0.55 * strength)}%, transparent)`,
    background: `color-mix(in srgb, ${c} ${pct(0.05 + 0.13 * strength)}%, transparent)`,
    color: `color-mix(in srgb, ${c} ${tier === "legendary" ? 88 : 78}%, #efe6d3)`,
  };
}

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
