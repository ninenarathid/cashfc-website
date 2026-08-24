"use client";

import { useState } from "react";

/**
 * ClassJob ids, which are also the icon numbers: ui/icon/062000/062{id}_hr1.tex.
 * Keyed by the full job name FF Logs reports (bestSpec), with the three-letter
 * abbreviation alongside because that is what people read at a glance.
 */
/**
 * Colours follow the in-game job stones rather than the parser palettes, so a tag
 * looks like the crystal a player recognises.
 *
 * Three stones are lifted from their true shade: Dark Knight, Ninja and Reaper are
 * near-black in game, and rendered honestly they would vanish into this background —
 * so each keeps the hue that identifies it (Dark Knight's wine, Ninja's red rune,
 * Reaper's gold) at a lightness that can actually be read.
 */
const JOBS: Record<string, { id: number; abbr: string; role: Role; color: string }> = {
  Paladin:      { id: 19, abbr: "PLD", role: "tank",   color: "#a8cfe4" },
  Warrior:      { id: 21, abbr: "WAR", role: "tank",   color: "#d33a30" },
  DarkKnight:   { id: 32, abbr: "DRK", role: "tank",   color: "#bc4f63" },
  Gunbreaker:   { id: 37, abbr: "GNB", role: "tank",   color: "#b3a04a" },
  WhiteMage:    { id: 24, abbr: "WHM", role: "healer", color: "#efe4cf" },
  Scholar:      { id: 28, abbr: "SCH", role: "healer", color: "#5f5fd4" },
  Astrologian:  { id: 33, abbr: "AST", role: "healer", color: "#dd8a2e" },
  Sage:         { id: 40, abbr: "SGE", role: "healer", color: "#cfdde3" },
  Monk:         { id: 20, abbr: "MNK", role: "dps",    color: "#d9a520" },
  Dragoon:      { id: 22, abbr: "DRG", role: "dps",    color: "#3f6ad0" },
  Ninja:        { id: 30, abbr: "NIN", role: "dps",    color: "#c84e5e" },
  Samurai:      { id: 34, abbr: "SAM", role: "dps",    color: "#e0d2ae" },
  Reaper:       { id: 39, abbr: "RPR", role: "dps",    color: "#a89060" },
  Viper:        { id: 41, abbr: "VPR", role: "dps",    color: "#c8443a" },
  Bard:         { id: 23, abbr: "BRD", role: "dps",    color: "#9cbe4a" },
  Machinist:    { id: 31, abbr: "MCH", role: "dps",    color: "#7fdcd6" },
  Dancer:       { id: 38, abbr: "DNC", role: "dps",    color: "#e6c9b8" },
  BlackMage:    { id: 25, abbr: "BLM", role: "dps",    color: "#8a5ac8" },
  Summoner:     { id: 27, abbr: "SMN", role: "dps",    color: "#46a862" },
  RedMage:      { id: 35, abbr: "RDM", role: "dps",    color: "#d8476a" },
  Pictomancer:  { id: 42, abbr: "PCT", role: "dps",    color: "#f0c53f" },
  BlueMage:     { id: 36, abbr: "BLU", role: "dps",    color: "#52a8dd" },
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

export const ROLE_LABEL: Record<Role, string> = {
  tank: "Tank", healer: "Healer", dps: "DPS",
};

/** FF Logs reports "RedMage", "DarkKnight", "BlackMage" with no space. */
export const jobLabel = (job: string): string =>
  job.replace(/([a-z])([A-Z])/g, "$1 $2");

export function jobRole(name?: string | null): Role | null {
  return jobInfo(name)?.role ?? null;
}

/** Every job FF Logs might report, for filter dropdowns. */
export const ALL_JOBS = Object.entries(JOBS)
  .map(([k, v]) => ({ name: k.replace(/([a-z])([A-Z])/g, "$1 $2"), ...v }))
  .sort((a, b) => a.role.localeCompare(b.role) || a.abbr.localeCompare(b.abbr));

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
