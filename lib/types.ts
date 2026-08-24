export interface Nameday { text: string | null; month: number | null; day: number | null }

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
  craft_achv?: number | null;
  pvp_achv?: number | null;
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
  collector: number; unknown: number; final_boss: number;
}
export interface Overlay {
  bio: string | null; job: string | null; accent: string | null;
  discord: string | null; lfg?: string[] | null; banner?: string | null;
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

export const isOnVacation = (m: Member): boolean => m.rank === ON_VACATION_RANK;

/** Playable races, in the order Lodestone lists them. */
export const RACE_ORDER = [
  "Hyur", "Elezen", "Lalafell", "Miqo'te", "Roegadyn", "Au Ra", "Hrothgar", "Viera",
];
