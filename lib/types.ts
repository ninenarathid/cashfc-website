export interface Nameday { text: string | null; month: number | null; day: number | null }

/**
 * How well and how much a member plays one job, from FF Logs. `parse` is the mean of
 * their best parses rather than the single highest, and `score` scales that by
 * experience so a lucky pull on a thin record cannot pass for proficiency.
 */
export interface JobScore {
  fights: number;
  kills: number;
  parse: number;
  score: number;
  tier: string | null;
  /** Hardest content this job's record covers: ultimate / savage / legacy / extreme. */
  hardest?: string | null;
}

export const CONTENT_LABEL: Record<string, string> = {
  ultimate: "Ultimate", savage: "Savage", legacy: "older Savage", extreme: "Extreme",
};

export interface Member {
  id: number;
  name: string;
  rank: string | null;
  level: number | null;
  avatar: string | null;
  portrait?: string | null;
  tags: string[];
  parse: number | null;
  savage_kills: number;
  ult_clears: number;
  current_clears?: boolean[] | null;
  mounts: number | null;
  minions: number | null;
  rare_achv: number | null;
  ach_public: boolean | null;
  fflogs: string;
  nameday?: Nameday | null;
  /** Race / clan scraped from Lodestone. Absent until the pipeline has covered them. */
  race?: string | null;
  clan?: string | null;
  /** Last date any tracked stat moved (YYYY-MM-DD). Null until enough history exists. */
  last_change?: string | null;
  /** Current-patch extreme trials this member has cleared, by boss name. */
  ex_cleared?: string[] | null;
  /**
   * Ultimates cleared, by full encounter name — abbreviate with ultimateAbbr().
   * The union of FF Logs and the clear achievements, because FF Logs is opt-in.
   */
  ult_cleared?: string[] | null;
  /** Of those, the ones only the achievement proves — there is no log to link to. */
  ult_achv_only?: string[] | null;
  /**
   * Per playstyle: how many rare achievements, the rarest one's ownership %, and the
   * rarity-weighted score the leaderboards and grades both rank on.
   */
  achv_buckets?: Record<string, { n: number; min: number | null; score?: number; share?: number }> | null;
  /** Per playstyle: "legendary" | "master" | "expert", from the rarest thing held. */
  achv_tiers?: Record<string, string> | null;
  /** Per job, from FF Logs: how good and how experienced they are on it. */
  job_scores?: Record<string, JobScore> | null;
  /** Their strongest job, present only when it reached Expert or better. */
  job_top?: (JobScore & { job: string }) | null;
  ex_kills?: number | null;
  /** Kills recorded in savage tiers older than the current one. */
  legacy_clears?: number | null;
  /**
   * Last date this member demonstrably did something, from Lalachievements
   * acquisition dates. Only as fresh as `lala_synced` — always show them together.
   */
  last_active?: string | null;
  lala_synced?: string | null;
  mount_rank?: string | null;
  minion_rank?: string | null;
}

export interface RaidEncounter {
  label: string | null; name: string | null;
  best: number | null; median: number | null;
  kills: number; job: string | null;
}
export interface RaidZone {
  zone: string; zone_id: number; expansion?: string | null;
  encounters: RaidEncounter[]; clears?: boolean[];
}
export interface UltimateEntry {
  zone: string; zone_id: number; expansion?: string | null;
  /**
   * The individual fight. Absent in data written before ultimates were split per
   * encounter, where `zone` was all there was — and a zone called "Ultimates
   * (Legacy)" covers five different fights, so prefer this whenever it is present.
   */
  name?: string | null;
  best: number | null; kills: number; job: string | null; cleared: boolean;
}
export interface ExtremeEntry {
  zone: string; zone_id: number; expansion?: string | null;
  name: string | null; best: number | null; kills: number;
  job: string | null; cleared: boolean;
}
export interface MemberRaids {
  current?: RaidZone;
  ultimates?: UltimateEntry[];
  /** Extreme trials of the current patch, one row per fight. */
  extremes?: ExtremeEntry[];
  legacy?: RaidZone[];
  _status?: string;
}

export interface BoardData {
  generated_at: string;
  fc: { name: string; id: string; world: string; dc: string;
        total: number; region?: string };
  current_tier?: { labels: string[]; zone?: { name?: string } | null };
  /** Every extreme trial of the current patch — the denominator for ex_cleared. */
  extremes?: string[];
  members: Member[];
}

export interface FeedEvent { date: string; type: string; id: number; name: string; text: string }
export interface NewsItem { title: string; url: string; date: string | null }
export interface HistoryRow {
  date: string; total: number; raider: number; ultimate: number;
  // Older rows recorded "collector" here; the tag is gone and newer runs write
  // "extreme" instead, so both are optional and the chart just skips a missing one.
  collector?: number; extreme?: number; unknown: number; final_boss: number;
  /**
   * Count per tag on that day. Absent from rows written before the FC did anything
   * but raid in this chart, which is why every series is drawn defensively.
   */
  tags?: Record<string, number>;
}
export interface Overlay {
  // No self-declared job: FF Logs reports the job behind each parse, which stays
  // honest for members who play several.
  bio: string | null; accent: string | null;
  discord: string | null; lfg?: string[] | null; banner?: string | null;
  nickname?: string | null;
  /** Real-world birthday. Day and month only — no year is ever collected. */
  birthMonth?: number | null; birthDay?: number | null;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "14 August" — never includes a year, because none is stored. */
export function formatBirthday(month?: number | null, day?: number | null): string | null {
  if (!month || !day) return null;
  return `${day} ${MONTH_NAMES[month - 1] ?? ""}`.trim();
}

export const LFG_OPTIONS = [
  { key: "static", label: "Looking for static" },
  { key: "mentor", label: "Happy to teach" },
  { key: "craft", label: "Taking craft requests" },
  { key: "friends", label: "Looking for friends" },
] as const;

export const RANK_ORDER = [
  "Dishwasher", "Sous Chef", "Chef de Cuisine", "Chief de popoto",
  "Food Raider", "Chef Toumant", "Taster", "Table Cat", "On vacation",
];

/**
 * FC rank used in-game to mark someone as not currently playing. Lodestone does not
 * publish last-login, so this officer-maintained rank is the only activity signal
 * that covers the whole roster.
 */
export const ON_VACATION_RANK = "On vacation";

/**
 * Where the roster parks its current query string so a member page can send you
 * back to the list you were actually looking at. Clicking into someone and landing
 * back on an unfiltered roster loses whatever search got you there.
 *
 * sessionStorage rather than the URL: the back link should follow the last list you
 * saw, not whatever was in the address bar when the page happened to be rendered.
 */
export const BOARD_QUERY_KEY = "fc_board_query";

export const isOnVacation = (m: Member): boolean => m.rank === ON_VACATION_RANK;

/**
 * Community shorthand for each Ultimate. FF Logs reports full encounter names, but
 * nobody says "The Unending Coil of Bahamut" out loud.
 */
export const ULTIMATE_ABBR: Record<string, string> = {
  "The Unending Coil of Bahamut": "UCOB",
  "The Weapon's Refrain": "UWU",
  "The Epic of Alexander": "TEA",
  "Dragonsong's Reprise": "DSR",
  "The Omega Protocol": "TOP",
  "Futures Rewritten": "FRU",
  "Dancing Mad": "DMU",
};

export const ultimateAbbr = (name: string): string =>
  ULTIMATE_ABBR[name] ??
  // Unknown or newly released: initials beat printing the whole title.
  name.replace(/^The\s+/i, "").split(/\s+/).map((w) => w[0]).join("").toUpperCase();

/**
 * Grade prefixes for the playstyle tags. Earned by holding a share of everything rare
 * in that playstyle — an absolute bar, so any number of members can reach it.
 */
export const ACHV_TIER_LABEL: Record<string, string> = {
  legendary: "Legendary",
  master: "Master",
  expert: "Expert",
};

export const ACHV_TIER_HELP: Record<string, string> = {
  legendary: "holds 25% or more of everything rare in this playstyle",
  master: "holds 12% or more of everything rare in this playstyle",
  expert: "holds 5% or more of everything rare in this playstyle",
};

/** Playable races, in the order Lodestone lists them. */
export const RACE_ORDER = [
  "Hyur", "Elezen", "Lalafell", "Miqo'te", "Roegadyn", "Au Ra", "Hrothgar", "Viera",
];
